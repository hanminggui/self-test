/**
 * Module 2: Metacognitive Protocol Engine and State Machine (session_manager.ts)
 * Orchestrates trial progression, strictly enforces zero feedback leakage,
 * computes wagering payoff matrices, and tracks staircase adaptation across sessions.
 * Uses local persistence for cohort data.
 */

import { Database } from "bun:sqlite";
import * as path from "path";
import * as fs from "fs";

import {
  PhaseType,
  MetacognitiveAction,
  SubjectType,
  TrialRequest,
  TrialRecord,
  FinalAssessmentReport,
  SubjectDataPoint,
  CohortScatterResponse,
  TrialResponse,
  SessionExecutionMetadata,
  TokenUsageStats,
} from "./models";
import { StaircaseController } from "./staircase";
import { TaskGenerator, GeneratedTask } from "./task_generator";
import { PsychometricScorer } from "./metrics";
import { ReportGenerator } from "./report_generator";
import { mapLegacyArchetype, getArchetypeDefinition, classifyCognitiveArchetype } from "./archetype_matrix";

export interface SessionState {
  sessionId: string;
  subjectType: string;
  subjectName: string;
  totalTrials: number;
  warmupTrials: number;
  currentTrialIndex: number;
  currentPhase: PhaseType;
  score: number;
  staircase: StaircaseController;
  taskGenerator: TaskGenerator;
  currentTask: GeneratedTask | null;
  records: TrialRecord[];
  isCompleted: boolean;
  finalReport: FinalAssessmentReport | null;
  stagedP1Choice: string | null;
  hintRevealedForCurrentTrial: boolean;
  hintsUnlockedForCurrentTrial: number; // 0 (none), 1 (tier1 unlocked), 2 (tier1 & tier2 unlocked)
  hintsCostForCurrentTrial: number; // 0, 1, or 3
  createdAt: string;
  startTimeMs: number;
  metadata?: SessionExecutionMetadata;
}

export class SessionManager {
  private sessions: Map<string, SessionState> = new Map();
  private db: Database;

  constructor(dbPath?: string) {
    const dataDir = path.resolve(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const resolvedDbPath = dbPath || path.join(dataDir, "sessions.sqlite");
    this.db = new Database(resolvedDbPath, { create: true });
    this.initDb();
    this.migrateFromLegacyJson(path.join(dataDir, "persisted_sessions.json"));
  }

  private initDb() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS completed_sessions (
        id TEXT PRIMARY KEY,
        name TEXT,
        subject_type TEXT,
        first_order_accuracy REAL,
        second_order_accuracy REAL,
        d_prime REAL,
        meta_d_prime REAL,
        m_ratio REAL,
        calibration_bias REAL,
        final_score INTEGER,
        created_at TEXT,
        role_title TEXT,
        quadrant_code TEXT,
        full_report_json TEXT,
        d_star REAL,
        ive REAL,
        clinical_summary TEXT
      )
    `);

    // Safe migration for existing sqlite databases
    try { this.db.run("ALTER TABLE completed_sessions ADD COLUMN d_star REAL"); } catch {}
    try { this.db.run("ALTER TABLE completed_sessions ADD COLUMN ive REAL"); } catch {}
    try { this.db.run("ALTER TABLE completed_sessions ADD COLUMN clinical_summary TEXT"); } catch {}
    try { this.db.run("ALTER TABLE completed_sessions ADD COLUMN total_duration_ms INTEGER"); } catch {}
    try { this.db.run("ALTER TABLE completed_sessions ADD COLUMN persona TEXT"); } catch {}
    try { this.db.run("ALTER TABLE completed_sessions ADD COLUMN thinking_effort TEXT"); } catch {}
    try { this.db.run("ALTER TABLE completed_sessions ADD COLUMN token_usage_json TEXT"); } catch {}
  }

  private migrateFromLegacyJson(jsonPath: string) {
    if (fs.existsSync(jsonPath)) {
      try {
        const raw = fs.readFileSync(jsonPath, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const insertStmt = this.db.prepare(`
            INSERT OR IGNORE INTO completed_sessions 
            (id, name, subject_type, first_order_accuracy, second_order_accuracy, d_prime, meta_d_prime, m_ratio, calibration_bias, final_score, created_at, role_title, quadrant_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const item of list) {
            insertStmt.run(
              item.id,
              item.name || "受测者",
              item.subject_type || "HUMAN",
              item.first_order_accuracy ?? 0.7,
              item.second_order_accuracy ?? 0.7,
              item.d_prime ?? 1.2,
              item.meta_d_prime ?? 1.1,
              item.m_ratio ?? 0.9,
              item.calibration_bias ?? 0.0,
              item.final_score ?? 0,
              item.created_at || new Date().toISOString(),
              item.role_title || "人形外挂",
              item.quadrant_code || "Q1_MASTER"
            );
          }
        }
      } catch (e) {
        console.warn("Legacy JSON migration notice:", e);
      }
    }
  }

  static generateRandomCodename(): string {
    const prefixes = [
      "星轨", "微光", "深空", "虚空", "极境", "无界", "辰极",
      "暗曜", "灵知", "破晓", "幻海", "以太", "云渊", "苍穹", "终焉"
    ];
    const suffixes = [
      "领航员", "漫游者", "探索家", "执剑人", "观测者",
      "寻迹者", "破壁人", "行者", "游侠", "先驱", "守夜人"
    ];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
    const num = String(Math.floor(Math.random() * 99) + 1).padStart(2, "0");
    return `${p}${s} · ${num}`;
  }

  createSession(params: {
    sessionId?: string;
    subjectName?: string;
    subjectType?: string;
    totalTrials?: number;
    warmupTrials?: number;
    initialDelta?: number;
    seed?: number;
    persona?: string;
    thinkingEffort?: string;
    metadata?: Partial<SessionExecutionMetadata>;
  }): SessionState {
    const sid = params.sessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const sName = params.subjectName?.trim() || SessionManager.generateRandomCodename();
    const subjectType = params.subjectType || SubjectType.HUMAN;
    const totalTrials = params.totalTrials ?? 30;
    const warmupTrials = params.warmupTrials ?? 10;
    const initialDelta = params.initialDelta ?? 0.50;

    const staircase = new StaircaseController(initialDelta);
    const taskGenerator = new TaskGenerator(params.seed);
    const initialTask = taskGenerator.generate(1, staircase.getCurrentDelta());

    const now = new Date();
    const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const startTimeMs = Date.now();

    const sessionMetadata: SessionExecutionMetadata = {
      model_name: params.metadata?.model_name || sName,
      persona: params.persona || params.metadata?.persona || "标准中性 (零人设)",
      thinking_effort: params.thinkingEffort || params.metadata?.thinking_effort || "none",
      total_trials: totalTrials,
      completed_trials: 0,
      warmup_trials: warmupTrials,
      token_usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        cached_tokens: 0,
        reasoning_tokens: 0,
        total_tokens: 0,
      },
      ...(params.metadata || {}),
    };

    const session: SessionState = {
      sessionId: sid,
      subjectType,
      subjectName: sName,
      totalTrials,
      warmupTrials,
      currentTrialIndex: 1,
      currentPhase: PhaseType.PHASE_1_FIRST_ORDER,
      score: 0,
      staircase,
      taskGenerator,
      currentTask: initialTask,
      records: [],
      isCompleted: false,
      finalReport: null,
      stagedP1Choice: null,
      hintRevealedForCurrentTrial: false,
      hintsUnlockedForCurrentTrial: 0,
      hintsCostForCurrentTrial: 0,
      createdAt,
      startTimeMs,
      metadata: sessionMetadata,
    };

    this.sessions.set(sid, session);
    return session;
  }

  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  getTrialRequest(sessionId: string): TrialRequest {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found.`);
    }

    if (session.isCompleted || !session.currentTask) {
      return {
        session_id: session.sessionId,
        trial_index: session.currentTrialIndex,
        phase: PhaseType.COMPLETED,
        payload: {
          stimulus_id: "completed",
          difficulty_level: session.staircase.getCurrentDelta(),
          prompt: "测试已全部完成。请查看最终评估报告。",
          options: { A: "COMPLETED", B: "COMPLETED" },
          has_hint: false,
          hint_cost: 0,
          hint_tier1_cost: 1,
          hint_tier2_cost: 2,
          hints_unlocked: 0,
          task_type: "COMPLETED",
        },
      };
    }

    return {
      session_id: session.sessionId,
      trial_index: session.currentTrialIndex,
      phase: session.currentPhase,
      payload: session.currentTask.toSafePayload(session.hintsUnlockedForCurrentTrial),
    };
  }

  submitPhase1(sessionId: string, choice: string): any {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session '${sessionId}' not found.`);
    if (session.isCompleted) {
      return {
        session_id: session.sessionId,
        trial_index: session.currentTrialIndex,
        phase: PhaseType.COMPLETED,
        status: "COMPLETED",
        is_completed: true,
        report: session.finalReport || this.finalizeReport(session),
      };
    }

    const upperChoice = choice.trim().toUpperCase();
    const validOpts = session.currentTask ? Object.keys(session.currentTask.options) : ["A", "B", "C", "D"];
    if (!validOpts.includes(upperChoice)) {
      throw new Error(`Invalid choice '${upperChoice}'. Must be one of ${validOpts.join(", ")}.`);
    }

    session.stagedP1Choice = upperChoice;
    session.currentPhase = PhaseType.PHASE_2_METACOGNITIVE;

    return {
      session_id: session.sessionId,
      trial_index: session.currentTrialIndex,
      phase: session.currentPhase,
      message: "Phase 1 choice recorded. Please submit Phase 2 metacognitive action.",
      available_actions: [
        { action: "HIGH_BET", description: "选对 +10 分；选错 -10 分" },
        { action: "SAFE_BET", description: "无论对错：保底 +3 分" },
      ],
    };
  }

  requestHint(sessionId: string): any {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session '${sessionId}' not found.`);
    if (session.isCompleted || !session.currentTask) throw new Error("Session already completed.");

    session.hintRevealedForCurrentTrial = true;
    const task = session.currentTask;

    if (session.hintsUnlockedForCurrentTrial === 0) {
      // Unlock Tier 1 (1 point)
      session.hintsUnlockedForCurrentTrial = 1;
      session.hintsCostForCurrentTrial = 1;
      return {
        session_id: session.sessionId,
        trial_index: session.currentTrialIndex,
        tier: 1,
        hint: task.hint_tier1,
        cost: 1,
        hint_cost: 1,
        total_cost: 1,
        next_tier_available: true,
        next_tier_cost: 2,
        message: "已解锁第 1 级宏观规律线索 (消耗 1 分)。后续仍有疑问可继续解锁第 2 级细节排除线索 (-2分)。",
      };
    } else if (session.hintsUnlockedForCurrentTrial === 1) {
      // Unlock Tier 2 (2 points, total 3)
      session.hintsUnlockedForCurrentTrial = 2;
      session.hintsCostForCurrentTrial = 3;
      return {
        session_id: session.sessionId,
        trial_index: session.currentTrialIndex,
        tier: 2,
        hint: task.hint_tier2,
        cost: 2,
        hint_cost: 2,
        total_cost: 3,
        next_tier_available: false,
        next_tier_cost: 0,
        message: "已解锁第 2 级细节穿透线索 (消耗 2 分，累计 3 分)。线索已全部解锁，请自由决策下注。",
      };
    } else {
      return {
        session_id: session.sessionId,
        trial_index: session.currentTrialIndex,
        tier: 2,
        hint: task.hint_tier2,
        cost: 0,
        total_cost: session.hintsCostForCurrentTrial,
        next_tier_available: false,
        next_tier_cost: 0,
        message: "所有线索已处于解锁状态。",
      };
    }
  }

  submitPhase2(
    sessionId: string,
    action: MetacognitiveAction,
    confidenceLevel?: number,
    revisedChoice?: string,
    metricsPayload?: {
      duration_ms?: number;
      token_usage?: TokenUsageStats;
      operations?: any[];
    }
  ): any {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session '${sessionId}' not found.`);
    if (session.isCompleted) {
      return {
        session_id: session.sessionId,
        trial_index: session.currentTrialIndex,
        status: "COMPLETED",
        is_completed: true,
        report: session.finalReport || this.finalizeReport(session),
      };
    }
    if (session.stagedP1Choice === null) throw new Error("Phase 1 choice has not been submitted yet.");
    if (!session.currentTask) throw new Error("No active trial task found.");

    const p1Choice = session.stagedP1Choice;
    const task = session.currentTask;
    const isP1Correct = p1Choice === task.correct_option;

    const hintBought = session.hintsCostForCurrentTrial > 0 || session.hintRevealedForCurrentTrial;
    let finalChoice = p1Choice;
    const validOpts = Object.keys(task.options);

    if (hintBought && revisedChoice) {
      const upperRev = revisedChoice.trim().toUpperCase();
      if (validOpts.includes(upperRev)) {
        finalChoice = upperRev;
      }
    }

    const isFinalCorrect = finalChoice === task.correct_option;

    let conf = confidenceLevel;
    if (conf === undefined || conf === null) {
      if (action === MetacognitiveAction.HIGH_BET) conf = 0.85;
      else if (action === MetacognitiveAction.SAFE_BET) conf = 0.55;
      else conf = 0.50;
    }

    const hintCost = session.hintsCostForCurrentTrial || 0;
    let scoreDelta = 0;
    if (action === MetacognitiveAction.HIGH_BET) {
      scoreDelta = (isFinalCorrect ? +10 : -10) - hintCost;
    } else if (action === MetacognitiveAction.SAFE_BET) {
      scoreDelta = +3 - hintCost;
    } else {
      // Fallback
      scoreDelta = (isFinalCorrect ? +10 : -10) - hintCost;
    }

    session.score += scoreDelta;

    const isWarmup = session.currentTrialIndex <= session.warmupTrials;
    const record: TrialRecord = {
      trial_index: session.currentTrialIndex,
      difficulty_level: task.difficulty_level,
      stimulus_id: task.stimulus_id,
      signal_type: task.signal_type,
      correct_option: task.correct_option,
      first_order_choice: p1Choice,
      is_correct_first_order: isP1Correct,
      action,
      confidence_level: conf,
      hint_purchased: hintBought,
      hints_unlocked: session.hintsUnlockedForCurrentTrial,
      hints_cost_total: hintCost,
      revised_choice: hintBought ? finalChoice : null,
      is_correct_final: isFinalCorrect,
      score_delta: scoreDelta,
      is_warmup: isWarmup,
      duration_ms: metricsPayload?.duration_ms,
      token_usage: metricsPayload?.token_usage,
      operations: metricsPayload?.operations,
    };
    session.records.push(record);

    if (session.metadata) {
      session.metadata.completed_trials = session.records.length;
      if (metricsPayload?.token_usage && session.metadata.token_usage) {
        const u = metricsPayload.token_usage;
        session.metadata.token_usage.prompt_tokens += (u.prompt_tokens || 0);
        session.metadata.token_usage.completion_tokens += (u.completion_tokens || 0);
        session.metadata.token_usage.cached_tokens += (u.cached_tokens || 0);
        session.metadata.token_usage.reasoning_tokens += (u.reasoning_tokens || 0);
        session.metadata.token_usage.total_tokens += (u.total_tokens || 0);
      }
    }

    // Update Staircase using first-order objective correctness
    const newDelta = session.staircase.update(isP1Correct);

    if (session.currentTrialIndex >= session.totalTrials) {
      session.isCompleted = true;
      session.currentPhase = PhaseType.COMPLETED;
      session.currentTask = null;
      const finalReport = this.finalizeReport(session);

      return {
        session_id: session.sessionId,
        trial_index: session.currentTrialIndex,
        status: "COMPLETED",
        is_completed: true,
        next_trial_index: null,
        current_score: session.score,
        score_delta: scoreDelta,
        report: finalReport,
      };
    }

    session.currentTrialIndex += 1;
    session.currentPhase = PhaseType.PHASE_1_FIRST_ORDER;
    session.stagedP1Choice = null;
    session.hintRevealedForCurrentTrial = false;
    session.hintsUnlockedForCurrentTrial = 0;
    session.hintsCostForCurrentTrial = 0;
    session.currentTask = session.taskGenerator.generate(session.currentTrialIndex, newDelta);

    return {
      session_id: session.sessionId,
      trial_index: session.currentTrialIndex - 1,
      status: "IN_PROGRESS",
      is_completed: false,
      next_trial_index: session.currentTrialIndex,
      current_score: session.score,
      score_delta: scoreDelta,
    };
  }

  processStep(res: TrialResponse): any {
    this.submitPhase1(res.session_id, res.phase_1_response.selected_option);
    return this.submitPhase2(
      res.session_id,
      res.phase_2_metacognitive_action.action,
      res.phase_2_metacognitive_action.confidence_level,
      res.phase_2_metacognitive_action.revised_option,
      res.trial_metrics
    );
  }

  finalizeReport(session: SessionState): FinalAssessmentReport {
    if (session.finalReport) return session.finalReport;

    const dStar = session.staircase.computeDStar(undefined, session.warmupTrials);
    const metrics = PsychometricScorer.evaluate(session.records, true, dStar);
    const report = ReportGenerator.generateReport(
      session.sessionId,
      session.subjectType,
      session.records,
      metrics,
      session.score,
      session.staircase.reversalCount,
      session.subjectName
    );

    // 完整附加试次记录与执行元数据
    report.records = session.records;
    if (session.metadata) {
      session.metadata.completed_trials = session.records.length;
      if (!session.metadata.total_duration_ms && session.startTimeMs) {
        session.metadata.total_duration_ms = Date.now() - session.startTimeMs;
      }
      report.metadata = session.metadata;
    }

    session.finalReport = report;

    // Persist to SQLite
    try {
      const evalRecords = session.records.filter(r => !r.is_warmup);
      const target = evalRecords.length > 0 ? evalRecords : session.records;
      const firstAcc = target.filter(r => r.is_correct_first_order).length / target.length;
      const secondAcc = PsychometricScorer.computeMetacognitiveJudgmentAccuracy(target);

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO completed_sessions
        (id, name, subject_type, first_order_accuracy, second_order_accuracy, d_prime, meta_d_prime, m_ratio, calibration_bias, final_score, created_at, role_title, quadrant_code, full_report_json, d_star, ive, clinical_summary, total_duration_ms, persona, thinking_effort, token_usage_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        report.session_id,
        report.subject_name,
        report.subject_type,
        firstAcc,
        secondAcc,
        metrics.d_prime,
        metrics.meta_d_prime,
        metrics.m_ratio,
        metrics.calibration_bias,
        report.summary.final_score,
        session.createdAt,
        report.diagnostic_profile.role_title,
        report.diagnostic_profile.quadrant_code,
        JSON.stringify(report),
        metrics.d_star,
        metrics.info_buying_efficiency,
        report.diagnostic_profile.clinical_summary,
        report.metadata?.total_duration_ms ?? null,
        report.metadata?.persona ?? null,
        report.metadata?.thinking_effort ?? null,
        report.metadata?.token_usage ? JSON.stringify(report.metadata.token_usage) : null
      );
    } catch (e) {
      console.warn("Error persisting session to DB:", e);
    }

    return report;
  }

  updateSessionMetadata(sessionId: string, metadata: Partial<SessionExecutionMetadata>): FinalAssessmentReport | undefined {
    const session = this.getSession(sessionId);
    if (session) {
      if (!session.metadata) {
        session.metadata = {
          model_name: session.subjectName,
          total_trials: session.totalTrials,
          completed_trials: session.records.length,
          warmup_trials: session.warmupTrials,
        };
      }
      Object.assign(session.metadata, metadata);
      if (metadata.token_usage) {
        session.metadata.token_usage = {
          ...(session.metadata.token_usage || {
            prompt_tokens: 0,
            completion_tokens: 0,
            cached_tokens: 0,
            reasoning_tokens: 0,
            total_tokens: 0,
          }),
          ...metadata.token_usage,
        };
      }
      if (session.finalReport) {
        session.finalReport.metadata = session.metadata;
        try {
          const stmt = this.db.prepare(`
            UPDATE completed_sessions
            SET full_report_json = ?,
                total_duration_ms = COALESCE(?, total_duration_ms),
                persona = COALESCE(?, persona),
                thinking_effort = COALESCE(?, thinking_effort),
                token_usage_json = COALESCE(?, token_usage_json)
            WHERE id = ?
          `);
          stmt.run(
            JSON.stringify(session.finalReport),
            session.metadata.total_duration_ms ?? null,
            session.metadata.persona ?? null,
            session.metadata.thinking_effort ?? null,
            session.metadata.token_usage ? JSON.stringify(session.metadata.token_usage) : null,
            sessionId
          );
        } catch (e) {
          console.warn("Error updating session metadata in DB:", e);
        }
        return session.finalReport;
      }
    } else {
      const row: any = this.db.query("SELECT * FROM completed_sessions WHERE id = ?").get(sessionId);
      if (row && row.full_report_json) {
        try {
          const rep: FinalAssessmentReport = JSON.parse(row.full_report_json);
          rep.metadata = {
            ...(rep.metadata || {}),
            ...metadata,
            model_name: metadata.model_name || rep.metadata?.model_name || rep.subject_name,
            total_trials: metadata.total_trials || rep.metadata?.total_trials || rep.summary.total_trials,
            completed_trials: metadata.completed_trials || rep.metadata?.completed_trials || rep.summary.total_trials,
            warmup_trials: metadata.warmup_trials || rep.metadata?.warmup_trials || 10,
          };
          if (metadata.token_usage) {
            rep.metadata.token_usage = {
              ...(rep.metadata.token_usage || {
                prompt_tokens: 0,
                completion_tokens: 0,
                cached_tokens: 0,
                reasoning_tokens: 0,
                total_tokens: 0,
              }),
              ...metadata.token_usage,
            };
          }
          const stmt = this.db.prepare(`
            UPDATE completed_sessions
            SET full_report_json = ?,
                total_duration_ms = COALESCE(?, total_duration_ms),
                persona = COALESCE(?, persona),
                thinking_effort = COALESCE(?, thinking_effort),
                token_usage_json = COALESCE(?, token_usage_json)
            WHERE id = ?
          `);
          stmt.run(
            JSON.stringify(rep),
            rep.metadata?.total_duration_ms ?? null,
            rep.metadata?.persona ?? null,
            rep.metadata?.thinking_effort ?? null,
            rep.metadata?.token_usage ? JSON.stringify(rep.metadata.token_usage) : null,
            sessionId
          );
          return rep;
        } catch (e) {
          console.warn("Error updating DB session metadata:", e);
        }
      }
    }
    return undefined;
  }

  deleteSession(sessionId: string): boolean {
    this.sessions.delete(sessionId);
    const stmt = this.db.prepare("DELETE FROM completed_sessions WHERE id = ?");
    const res: any = stmt.run(sessionId);
    return (res?.changes ?? 0) > 0;
  }

  getReport(sessionId: string): FinalAssessmentReport {
    const session = this.getSession(sessionId);
    if (session && session.finalReport) {
      return session.finalReport;
    }
    if (session && session.isCompleted) {
      return this.finalizeReport(session);
    }

    // Try reading from DB
    const row: any = this.db.query("SELECT * FROM completed_sessions WHERE id = ?").get(sessionId);
    if (row) {
      if (row.full_report_json) {
        const parsed = JSON.parse(row.full_report_json);
        const dStarVal = row.d_star ?? (parsed.metacognitive_metrics.d_star ?? Math.round(Math.max(0, Math.min(1, ((parsed.summary.first_order_accuracy ?? 0.7) - 0.20) / 0.80)) * 1000) / 1000);
        const mRatioVal = parsed.metacognitive_metrics.m_ratio;
        const biasVal = parsed.metacognitive_metrics.calibration_bias;
        const iveVal = parsed.metacognitive_metrics.info_buying_efficiency ?? 0.50;
        const dPrimeVal = parsed.metacognitive_metrics.d_prime ?? 1.2;
        const brierVal = parsed.metacognitive_metrics.brier_score ?? 0.20;

        parsed.metacognitive_metrics.d_star = dStarVal;
        parsed.metacognitive_metrics.cognitive_manifold_vector = [dStarVal, mRatioVal, biasVal, iveVal];

        // 动态根据 v2 超平面重新归纳画像，彻底消除历史遗留旧画像漂移
        const archetype = classifyCognitiveArchetype({
          dStar: dStarVal,
          dPrime: dPrimeVal,
          mRatio: mRatioVal,
          bias: biasVal,
          brier: brierVal,
          ive: iveVal,
          hintsCount: 0,
        });
        const def = getArchetypeDefinition(archetype);
        parsed.diagnostic_profile.archetype = archetype;
        parsed.diagnostic_profile.role_title = def.role_title;
        parsed.diagnostic_profile.quadrant_code = def.quadrant_code;
        parsed.diagnostic_profile.praise_tagline = def.praise_tagline;
        parsed.diagnostic_profile.strength_tags = def.strength_tags;
        parsed.diagnostic_profile.empowering_feedback = def.empowering_feedback;
        parsed.diagnostic_profile.growth_advice = def.growth_advice;
        parsed.diagnostic_profile.skills = def.skills;
        parsed.diagnostic_profile.clinical_summary = def.clinical_summary;
        if (!parsed.metadata) {
          let tokenUsage = undefined;
          if (row.token_usage_json) {
            try { tokenUsage = JSON.parse(row.token_usage_json); } catch {}
          }
          if (row.total_duration_ms || row.persona || row.thinking_effort || tokenUsage) {
            parsed.metadata = {
              model_name: row.name,
              persona: row.persona,
              thinking_effort: row.thinking_effort,
              total_duration_ms: row.total_duration_ms,
              total_trials: parsed.summary?.total_trials ?? 0,
              completed_trials: parsed.summary?.total_trials ?? 0,
              warmup_trials: 10,
              token_usage: tokenUsage,
            };
          }
        }
        return parsed;
      }

      // Synthesize fallback report for legacy migrated record
      const dStarVal = row.d_star ?? Math.round(Math.max(0, Math.min(1, ((row.first_order_accuracy ?? 0.7) - 0.20) / 0.80)) * 1000) / 1000;
      const mRatioVal = row.m_ratio ?? 0.9;
      const biasVal = row.calibration_bias ?? 0.0;
      const iveVal = row.ive ?? 0.50;
      const dPrimeVal = row.d_prime ?? 1.2;

      const archetype = classifyCognitiveArchetype({
        dStar: dStarVal,
        dPrime: dPrimeVal,
        mRatio: mRatioVal,
        bias: biasVal,
        brier: 0.20,
        ive: iveVal,
        hintsCount: 0,
      });
      const def = getArchetypeDefinition(archetype);

      const metrics: any = {
        d_prime: dPrimeVal,
        meta_d_prime: row.meta_d_prime ?? 1.1,
        m_ratio: mRatioVal,
        calibration_bias: biasVal,
        brier_score: 0.15,
        info_buying_efficiency: iveVal,
        d_star: dStarVal,
        cognitive_manifold_vector: [dStarVal, mRatioVal, biasVal, iveVal],
      };
      return ReportGenerator.generateReport(
        row.id,
        row.subject_type || "HUMAN",
        [],
        metrics,
        row.final_score ?? 0,
        4,
        row.name || "受测者"
      );
    }

    throw new Error(`Report for session '${sessionId}' is not available.`);
  }

  getCohortScatterData(currentSessionId?: string): CohortScatterResponse {
    const rows = this.db.query("SELECT * FROM completed_sessions ORDER BY created_at DESC").all() as any[];

    const subjects: SubjectDataPoint[] = rows.map(r => {
      const dStar = r.d_star ?? Math.round(Math.max(0, Math.min(1, ((r.first_order_accuracy ?? 0.7) - 0.20) / 0.80)) * 1000) / 1000;
      const ive = r.ive ?? 0.50;
      const mRatio = Math.round((r.m_ratio ?? 0.9) * 1000) / 1000;
      const bias = Math.round((r.calibration_bias ?? 0.0) * 1000) / 1000;
      const dPrime = Math.round((r.d_prime ?? 1.2) * 1000) / 1000;

      let brier = 0.20;
      let hintsCount = 0;
      let sessionMetadata: SessionExecutionMetadata | undefined = undefined;
      if (r.full_report_json) {
        try {
          const parsed = JSON.parse(r.full_report_json);
          if (parsed.metacognitive_metrics?.brier_score !== undefined) {
            brier = parsed.metacognitive_metrics.brier_score;
          }
          if (parsed.metadata) {
            sessionMetadata = parsed.metadata;
          }
        } catch {}
      }
      if (!sessionMetadata && (r.total_duration_ms || r.persona || r.thinking_effort || r.token_usage_json)) {
        let tokenUsage = undefined;
        if (r.token_usage_json) {
          try { tokenUsage = JSON.parse(r.token_usage_json); } catch {}
        }
        sessionMetadata = {
          model_name: r.name,
          persona: r.persona,
          thinking_effort: r.thinking_effort,
          total_duration_ms: r.total_duration_ms,
          total_trials: 0,
          completed_trials: 0,
          warmup_trials: 0,
          token_usage: tokenUsage,
        };
      }

      // 动态通过 v2 超平面算法为历史数据重新分类，使悬浮画像与散点坐标绝对严格对应
      const archetype = classifyCognitiveArchetype({
        dStar,
        dPrime,
        mRatio,
        bias,
        brier,
        ive,
        hintsCount,
      });
      const def = getArchetypeDefinition(archetype);

      return {
        id: r.id,
        name: r.name,
        subject_type: r.subject_type,
        first_order_accuracy: Math.round((r.first_order_accuracy ?? 0.7) * 1000) / 1000,
        second_order_accuracy: Math.round((r.second_order_accuracy ?? 0.7) * 1000) / 1000,
        d_prime: dPrime,
        meta_d_prime: Math.round((r.meta_d_prime ?? 1.1) * 1000) / 1000,
        m_ratio: mRatio,
        calibration_bias: bias,
        final_score: r.final_score ?? 0,
        is_current: r.id === currentSessionId,
        created_at: r.created_at,
        role_title: def.role_title,
        quadrant_code: def.quadrant_code,
        d_star: dStar,
        ive: ive,
        cognitive_manifold_vector: [dStar, mRatio, bias, ive],
        clinical_summary: def.clinical_summary,
        metadata: sessionMetadata,
      };
    });

    // If current session is active and not yet saved
    if (currentSessionId && !subjects.some(s => s.id === currentSessionId)) {
      const active = this.getSession(currentSessionId);
      if (active && active.records.length > 0) {
        const evalRecords = active.records.filter(r => !r.is_warmup);
        const target = evalRecords.length > 0 ? evalRecords : active.records;
        const firstAcc = target.filter(r => r.is_correct_first_order).length / target.length;
        const secondAcc = PsychometricScorer.computeMetacognitiveJudgmentAccuracy(target);
        const dStar = active.staircase.computeDStar();
        const metrics = PsychometricScorer.evaluate(active.records, true, dStar);

        subjects.unshift({
          id: active.sessionId,
          name: active.subjectName,
          subject_type: active.subjectType,
          first_order_accuracy: Math.round(firstAcc * 1000) / 1000,
          second_order_accuracy: Math.round(secondAcc * 1000) / 1000,
          d_prime: metrics.d_prime,
          meta_d_prime: metrics.meta_d_prime,
          m_ratio: metrics.m_ratio,
          calibration_bias: metrics.calibration_bias,
          final_score: active.score,
          is_current: true,
          created_at: active.createdAt,
          role_title: active.finalReport?.diagnostic_profile.role_title,
          quadrant_code: active.finalReport?.diagnostic_profile.quadrant_code,
          d_star: metrics.d_star,
          ive: metrics.info_buying_efficiency,
          cognitive_manifold_vector: metrics.cognitive_manifold_vector,
          clinical_summary: active.finalReport?.diagnostic_profile.clinical_summary,
        });
      }
    }

    const xVals = subjects.map(s => s.d_star);
    const yVals = subjects.map(s => s.m_ratio);

    const median = (arr: number[]): number => {
      if (arr.length === 0) return 0.50;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    const mean = (arr: number[]): number => {
      if (arr.length === 0) return 0.50;
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    };

    return {
      baseline_x: 0.60,
      baseline_y: 0.80,
      median_x: Math.round(median(xVals) * 1000) / 1000,
      median_y: Math.round(median(yVals) * 1000) / 1000,
      mean_x: Math.round(mean(xVals) * 1000) / 1000,
      mean_y: Math.round(mean(yVals) * 1000) / 1000,
      subjects,
    };
  }
}
