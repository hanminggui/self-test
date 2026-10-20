/**
 * Module 2: Metacognitive Protocol Engine and State Machine (session_manager.ts)
 * Orchestrates trial progression, strictly enforces zero feedback leakage,
 * computes wagering payoff matrices, and tracks staircase adaptation across sessions.
 * Uses local persistence for cohort data.
 */

import * as path from "path";
import * as fs from "fs";

import { StorageAdapter, LocalSqliteAdapter } from "../storage";
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
import { StaircaseController, StaircaseSnapshot } from "./staircase";
import { TaskGenerator, GeneratedTask, TaskGeneratorSnapshot } from "./task_generator";
import { PsychometricScorer } from "./metrics";
import { ReportGenerator } from "./report_generator";
import { mapLegacyArchetype, getArchetypeDefinition, classifyCognitiveArchetype } from "./archetype_matrix";
import { compute4AFCdPrime } from "./math";
import { generateSubjectCodename } from "./codename_generator";
import { getLocale, type SupportedLocale } from "../i18n";

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
  hintsUnlockedBeforeP1: number; // Tracks hints unlocked prior to Phase 1 submission
  hintsCostForCurrentTrial: number; // 0, 1, or 3
  createdAt: string;
  startTimeMs: number;
  metadata?: SessionExecutionMetadata;
}

export class SessionManager {
  private sessions: Map<string, SessionState> = new Map();
  public readonly storage: StorageAdapter;

  constructor(storageOrDbPath?: StorageAdapter | string) {
    if (storageOrDbPath && typeof storageOrDbPath !== "string") {
      this.storage = storageOrDbPath;
    } else {
      let created = false;
      try {
        const dataDir = path.resolve(process.cwd(), "data");
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        const resolvedDbPath = storageOrDbPath || path.join(dataDir, "sessions.sqlite");
        this.storage = new LocalSqliteAdapter(resolvedDbPath);
        created = true;
      } catch {
        // Filesystem or bun:sqlite not available (e.g. edge / Cloudflare Workers runtime)
        this.storage = {
          engine: "edge_fallback",
          query: async () => [],
          run: async () => ({ changes: 0 }),
          exec: async () => {},
        };
      }
    }
    // Schema is guaranteed to be provisioned at startup (LocalSqliteAdapter.ensureSchema) or deploy-time (D1 migrations).
    // SessionManager contains zero DDL logic during business runtime.
    if (this.storage instanceof LocalSqliteAdapter) {
      this.migrateFromLegacyJson(path.join(process.cwd(), "data", "persisted_sessions.json"));
      this.recalibrateHistoricalSessions();
    }
  }

  getStorage(): StorageAdapter {
    return this.storage;
  }

  /**
   * Automatically recalibrates persisted historical sessions,
   * fixing past D* monotonic tail truncation, 4AFC-to-2AFC degeneration, and IVE deadlock.
   */
  private recalibrateHistoricalSessions() {
    try {
      const selectSql = "SELECT id, first_order_accuracy, d_prime, meta_d_prime, m_ratio, calibration_bias, d_star, ive, full_report_json FROM completed_sessions WHERE full_report_json IS NOT NULL";
      const rows = (this.storage.querySync ? this.storage.querySync<any>(selectSql) : []) as any[];
      if (!rows || rows.length === 0) return;

      const updateSql = `
        UPDATE completed_sessions
        SET d_prime = ?,
            meta_d_prime = ?,
            m_ratio = ?,
            calibration_bias = ?,
            d_star = ?,
            ive = ?,
            role_title = ?,
            quadrant_code = ?,
            clinical_summary = ?,
            full_report_json = ?
        WHERE id = ?
      `;

      for (const row of rows) {
        try {
          const parsed: FinalAssessmentReport = JSON.parse(row.full_report_json);
          if (parsed.records && Array.isArray(parsed.records) && parsed.records.length > 0) {
            const records: TrialRecord[] = parsed.records;
            const warmupCount = records.filter(r => r.is_warmup).length;
            const initialDelta = records[0]?.difficulty_level ?? 0.50;
            const sc = new StaircaseController(initialDelta);
            for (const rec of records) {
              const heavyHintBeforeP1 = (rec.hints_unlocked ?? 0) >= 2 && (!rec.revised_choice || rec.revised_choice === rec.first_order_choice);
              sc.update(rec.is_correct_first_order, heavyHintBeforeP1);
            }

            const dStar = sc.computeDStar(undefined, warmupCount);
            const metrics = PsychometricScorer.evaluate(records, true, dStar);
            const hintsCount = ReportGenerator.countHintTrials(records, true);

            const archetype = classifyCognitiveArchetype({
              dStar: metrics.d_star,
              dPrime: metrics.d_prime,
              mRatio: metrics.m_ratio,
              bias: metrics.calibration_bias,
              brier: metrics.brier_score,
              ive: metrics.info_buying_efficiency,
              hintsCount,
            });
            const def = getArchetypeDefinition(archetype);

            parsed.metacognitive_metrics = metrics;
            if (parsed.summary) {
              parsed.summary.d_star = metrics.d_star;
              parsed.summary.reversals_count = sc.reversalCount;
            }
            parsed.diagnostic_profile.archetype = archetype;
            parsed.diagnostic_profile.role_title = def.role_title;
            parsed.diagnostic_profile.quadrant_code = def.quadrant_code;
            parsed.diagnostic_profile.praise_tagline = def.praise_tagline;
            parsed.diagnostic_profile.strength_tags = def.strength_tags;
            parsed.diagnostic_profile.empowering_feedback = def.empowering_feedback;
            parsed.diagnostic_profile.growth_advice = def.growth_advice;
            parsed.diagnostic_profile.skills = def.skills;
            parsed.diagnostic_profile.clinical_summary = def.clinical_summary;

            const updateParams = [
              metrics.d_prime,
              metrics.meta_d_prime,
              metrics.m_ratio,
              metrics.calibration_bias,
              metrics.d_star,
              metrics.info_buying_efficiency,
              def.role_title,
              def.quadrant_code,
              def.clinical_summary,
              JSON.stringify(parsed),
              row.id
            ];
            if (this.storage.runSync) {
              this.storage.runSync(updateSql, updateParams);
            } else {
              this.storage.run(updateSql, updateParams).catch(() => {});
            }
          } else if (parsed.metacognitive_metrics && parsed.summary) {
            // Fix legacy summary-only records affected by 4AFC-to-2AFC degeneration or ceiling D* truncation
            const acc = parsed.summary.first_order_accuracy ?? row.first_order_accuracy ?? 0.7;
            const totalN = parsed.summary.total_trials ?? 30;
            const evalN = Math.max(1, Math.round(totalN * (2 / 3)));
            let dPrime = parsed.metacognitive_metrics.d_prime ?? row.d_prime ?? 1.2;
            let metaD = parsed.metacognitive_metrics.meta_d_prime ?? row.meta_d_prime ?? 1.0;
            let mRatio = parsed.metacognitive_metrics.m_ratio ?? row.m_ratio ?? 0.8;
            let dStar = parsed.metacognitive_metrics.d_star ?? row.d_star ?? 0.5;
            let ive = parsed.metacognitive_metrics.info_buying_efficiency ?? row.ive ?? 0.5;
            const bias = parsed.metacognitive_metrics.calibration_bias ?? row.calibration_bias ?? 0.0;
            const brier = parsed.metacognitive_metrics.brier_score ?? 0.20;

            let changed = false;

            // 1. Fix 4AFC degeneration bug where acc > 0.30 yielded dPrime == 0.01 or acc >= 0.80 yielded 2AFC dPrime < 1.50
            if ((acc > 0.30 && dPrime <= 0.02) || (acc >= 0.80 && dPrime < 1.50)) {
              const nCorr = Math.round(acc * evalN);
              const pc = Math.max(0.2501, Math.min(0.9994, (nCorr + 0.5) / (evalN + 1.0)));
              dPrime = compute4AFCdPrime(pc);
              const signalMod = Math.min(1.0, Math.max(0.05, dPrime / 0.50));
              mRatio = Math.round(Math.max(0.01, Math.min(2.0, (metaD / Math.max(0.40, dPrime)) * signalMod)) * 10000) / 10000;
              changed = true;
            }

            // 2. Fix Monotonic Tail Ceiling truncation where >= 95% accuracy over >= 40 trials had dStar < 0.80
            if (acc >= 0.95 && totalN >= 40 && dPrime >= 2.5 && dStar < 0.80) {
              dStar = 1.0;
              changed = true;
            }

            // 3. Fix legacy single-pass hint IVE deadlock where high-accuracy subject bought hints pre-P1 and got ive === 0
            if (ive === 0 && acc >= 0.90) {
              ive = Math.round(Math.min(1.0, acc * 0.98) * 10000) / 10000;
              changed = true;
            }

            if (changed) {
              parsed.metacognitive_metrics.d_prime = dPrime;
              parsed.metacognitive_metrics.m_ratio = mRatio;
              parsed.metacognitive_metrics.d_star = dStar;
              parsed.metacognitive_metrics.info_buying_efficiency = ive;
              parsed.metacognitive_metrics.cognitive_manifold_vector = [dStar, mRatio, bias, ive];
              parsed.summary.d_star = dStar;

              const archetype = classifyCognitiveArchetype({
                dStar,
                dPrime,
                mRatio,
                bias,
                brier,
                ive,
                hintsCount: ive > 0.5 ? 3 : 0,
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

              const updateParams = [
                dPrime,
                metaD,
                mRatio,
                bias,
                dStar,
                ive,
                def.role_title,
                def.quadrant_code,
                def.clinical_summary,
                JSON.stringify(parsed),
                row.id
              ];
              if (this.storage.runSync) {
                this.storage.runSync(updateSql, updateParams);
              } else {
                this.storage.run(updateSql, updateParams).catch(() => {});
              }
            }
          }
        } catch {}
      }
    } catch (e) {
      console.warn("Historical sessions recalibration notice:", e);
    }
  }

  private migrateFromLegacyJson(jsonPath: string) {
    if (fs.existsSync(jsonPath)) {
      try {
        const raw = fs.readFileSync(jsonPath, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const insertSql = `
            INSERT OR IGNORE INTO completed_sessions 
            (id, name, subject_type, first_order_accuracy, second_order_accuracy, d_prime, meta_d_prime, m_ratio, calibration_bias, final_score, created_at, role_title, quadrant_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          for (const item of list) {
            const params = [
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
            ];
            if (this.storage.runSync) {
              this.storage.runSync(insertSql, params);
            } else {
              this.storage.run(insertSql, params).catch(() => {});
            }
          }
        }
      } catch (e) {
        console.warn("Legacy JSON migration notice:", e);
      }
    }
  }

  public saveActiveSession(session: SessionState): void {
    if (session.isCompleted) return;
    const sql = `
      INSERT OR REPLACE INTO active_sessions (
        id, subject_type, subject_name, total_trials, warmup_trials,
        current_trial_index, current_phase, score, staircase_state_json,
        task_generator_state_json, current_task_json, records_json,
        is_completed, staged_p1_choice, hint_revealed, hints_unlocked,
        hints_unlocked_before_p1, hints_cost, created_at, start_time_ms,
        metadata_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      session.sessionId,
      session.subjectType,
      session.subjectName,
      session.totalTrials,
      session.warmupTrials,
      session.currentTrialIndex,
      session.currentPhase,
      session.score,
      JSON.stringify(session.staircase.toJSON()),
      JSON.stringify(session.taskGenerator.getState()),
      session.currentTask ? JSON.stringify(session.currentTask) : null,
      JSON.stringify(session.records),
      session.isCompleted ? 1 : 0,
      session.stagedP1Choice,
      session.hintRevealedForCurrentTrial ? 1 : 0,
      session.hintsUnlockedForCurrentTrial,
      session.hintsUnlockedBeforeP1,
      session.hintsCostForCurrentTrial,
      session.createdAt,
      session.startTimeMs,
      session.metadata ? JSON.stringify(session.metadata) : null,
      new Date().toISOString(),
    ];

    if (this.storage.runSync) {
      this.storage.runSync(sql, params);
    } else {
      this.storage.run(sql, params).catch((e) => console.warn("Error saving active session:", e));
    }
  }

  public async saveActiveSessionAsync(session: SessionState): Promise<void> {
    if (session.isCompleted) return;
    const sql = `
      INSERT OR REPLACE INTO active_sessions (
        id, subject_type, subject_name, total_trials, warmup_trials,
        current_trial_index, current_phase, score, staircase_state_json,
        task_generator_state_json, current_task_json, records_json,
        is_completed, staged_p1_choice, hint_revealed, hints_unlocked,
        hints_unlocked_before_p1, hints_cost, created_at, start_time_ms,
        metadata_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      session.sessionId,
      session.subjectType,
      session.subjectName,
      session.totalTrials,
      session.warmupTrials,
      session.currentTrialIndex,
      session.currentPhase,
      session.score,
      JSON.stringify(session.staircase.toJSON()),
      JSON.stringify(session.taskGenerator.getState()),
      session.currentTask ? JSON.stringify(session.currentTask) : null,
      JSON.stringify(session.records),
      session.isCompleted ? 1 : 0,
      session.stagedP1Choice,
      session.hintRevealedForCurrentTrial ? 1 : 0,
      session.hintsUnlockedForCurrentTrial,
      session.hintsUnlockedBeforeP1,
      session.hintsCostForCurrentTrial,
      session.createdAt,
      session.startTimeMs,
      session.metadata ? JSON.stringify(session.metadata) : null,
      new Date().toISOString(),
    ];
    await this.storage.run(sql, params);
  }

  public removeActiveSession(sessionId: string): void {
    if (this.storage.runSync) {
      this.storage.runSync("DELETE FROM active_sessions WHERE id = ?", [sessionId]);
    } else {
      this.storage.run("DELETE FROM active_sessions WHERE id = ?", [sessionId]).catch((e) => console.warn(e));
    }
  }

  public async removeActiveSessionAsync(sessionId: string): Promise<void> {
    await this.storage.run("DELETE FROM active_sessions WHERE id = ?", [sessionId]);
  }

  private restoreSessionFromRow(row: any): SessionState {
    const sc = StaircaseController.fromJSON(JSON.parse(row.staircase_state_json));
    const tg = TaskGenerator.fromState(JSON.parse(row.task_generator_state_json));
    const currentTask = row.current_task_json ? TaskGenerator.reviveTask(JSON.parse(row.current_task_json)) : null;
    const records = row.records_json ? JSON.parse(row.records_json) : [];
    const metadata = row.metadata_json ? JSON.parse(row.metadata_json) : undefined;

    const restored: SessionState = {
      sessionId: row.id,
      subjectType: row.subject_type,
      subjectName: row.subject_name,
      totalTrials: row.total_trials,
      warmupTrials: row.warmup_trials,
      currentTrialIndex: row.current_trial_index,
      currentPhase: row.current_phase as PhaseType,
      score: row.score,
      staircase: sc,
      taskGenerator: tg,
      currentTask,
      records,
      isCompleted: Boolean(row.is_completed),
      finalReport: null,
      stagedP1Choice: row.staged_p1_choice ?? null,
      hintRevealedForCurrentTrial: Boolean(row.hint_revealed),
      hintsUnlockedForCurrentTrial: row.hints_unlocked ?? 0,
      hintsUnlockedBeforeP1: row.hints_unlocked_before_p1 ?? 0,
      hintsCostForCurrentTrial: row.hints_cost ?? 0,
      createdAt: row.created_at,
      startTimeMs: row.start_time_ms ?? Date.now(),
      metadata,
    };

    this.sessions.set(restored.sessionId, restored);
    return restored;
  }

  public loadActiveSession(sessionId: string): SessionState | undefined {
    if (this.storage.querySync) {
      const rows = this.storage.querySync<any>("SELECT * FROM active_sessions WHERE id = ?", [sessionId]);
      if (rows && rows.length > 0) {
        return this.restoreSessionFromRow(rows[0]);
      }
    }
    return undefined;
  }

  public async loadActiveSessionAsync(sessionId: string): Promise<SessionState | undefined> {
    const rows = await this.storage.query<any>("SELECT * FROM active_sessions WHERE id = ?", [sessionId]);
    if (rows && rows.length > 0) {
      return this.restoreSessionFromRow(rows[0]);
    }
    return undefined;
  }

  static generateRandomCodename(): string {
    return generateSubjectCodename();
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
      hintsUnlockedBeforeP1: 0,
      hintsCostForCurrentTrial: 0,
      createdAt,
      startTimeMs,
      metadata: sessionMetadata,
    };

    this.pruneMemorySessions(200);
    this.sessions.set(sid, session);
    this.saveActiveSession(session);
    return session;
  }

  async createSessionAsync(params: {
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
  }): Promise<SessionState> {
    const session = this.createSession(params);
    await this.saveActiveSessionAsync(session);
    return session;
  }

  /**
   * Evicts oldest completed sessions from in-memory Map when capacity is exceeded
   * (completed sessions remain persisted in SQLite).
   */
  private pruneMemorySessions(maxSize: number = 200) {
    if (this.sessions.size < maxSize) return;
    for (const [id, sess] of this.sessions.entries()) {
      if (sess.isCompleted) {
        this.sessions.delete(id);
        if (this.sessions.size < maxSize) break;
      }
    }
  }

  getSession(sessionId: string): SessionState | undefined {
    const inMemory = this.sessions.get(sessionId);
    if (inMemory) return inMemory;
    return this.loadActiveSession(sessionId);
  }

  async getSessionAsync(sessionId: string): Promise<SessionState | undefined> {
    const inMemory = this.sessions.get(sessionId);
    if (inMemory) return inMemory;
    return this.loadActiveSessionAsync(sessionId);
  }

  async getTrialRequestAsync(sessionId: string, locale?: SupportedLocale): Promise<TrialRequest> {
    const session = await this.getSessionAsync(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found.`);
    }
    return this.getTrialRequest(sessionId, locale);
  }

  getTrialRequest(sessionId: string, locale?: SupportedLocale): TrialRequest {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found.`);
    }

    const targetLocale = locale || getLocale();

    if (session.isCompleted || !session.currentTask) {
      const msg = targetLocale === "en-US"
        ? "Assessment fully completed. Please inspect your final diagnostic evaluation report."
        : "测试已全部完成。请查看最终评估报告。";
      return {
        session_id: session.sessionId,
        trial_index: session.currentTrialIndex,
        phase: PhaseType.COMPLETED,
        payload: {
          stimulus_id: "completed",
          difficulty_level: session.staircase.getCurrentDelta(),
          prompt: msg,
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
      payload: session.currentTask.toSafePayload(session.hintsUnlockedForCurrentTrial, targetLocale),
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
    this.saveActiveSession(session);

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

  async submitPhase1Async(sessionId: string, choice: string): Promise<any> {
    await this.getSessionAsync(sessionId);
    const res = this.submitPhase1(sessionId, choice);
    const session = this.getSession(sessionId);
    if (session) {
      await this.saveActiveSessionAsync(session);
    }
    return res;
  }

  requestHint(sessionId: string, locale?: SupportedLocale): any {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session '${sessionId}' not found.`);
    if (session.isCompleted || !session.currentTask) throw new Error("Session already completed.");

    session.hintRevealedForCurrentTrial = true;
    const task = session.currentTask;
    const targetLocale = locale || getLocale();

    let res: any;
    if (session.hintsUnlockedForCurrentTrial === 0) {
      // Unlock Tier 1 (1 point)
      session.hintsUnlockedForCurrentTrial = 1;
      session.hintsCostForCurrentTrial = 1;
      if (session.stagedP1Choice === null) {
        session.hintsUnlockedBeforeP1 = 1;
      }
      const hintText = task.bilingual?.hint_tier1[targetLocale] || task.hint_tier1;
      const msg = targetLocale === "en-US"
        ? "Unlocked Tier 1 Macro Clue (Cost: 1 pt). You may further unlock Tier 2 Micro Distractor Elimination (-2 pts) if uncertainty persists."
        : "已解锁第 1 级宏观规律线索 (消耗 1 分)。后续仍有疑问可继续解锁第 2 级细节排除线索 (-2分)。";
      res = {
        session_id: session.sessionId,
        trial_index: session.currentTrialIndex,
        tier: 1,
        hint: hintText,
        cost: 1,
        hint_cost: 1,
        total_cost: 1,
        next_tier_available: true,
        next_tier_cost: 2,
        message: msg,
      };
    } else if (session.hintsUnlockedForCurrentTrial === 1) {
      // Unlock Tier 2 (2 points, total 3)
      session.hintsUnlockedForCurrentTrial = 2;
      session.hintsCostForCurrentTrial = 3;
      if (session.stagedP1Choice === null) {
        session.hintsUnlockedBeforeP1 = 2;
      }
      const hintText = task.bilingual?.hint_tier2[targetLocale] || task.hint_tier2;
      const msg = targetLocale === "en-US"
        ? "Unlocked Tier 2 Micro Constraint Clue (Cost: 2 pts, Cumulative: 3 pts). All clues unlocked; please proceed with wagering."
        : "已解锁第 2 级细节穿透线索 (消耗 2 分，累计 3 分)。线索已全部解锁，请自由决策下注。";
      res = {
        session_id: session.sessionId,
        trial_index: session.currentTrialIndex,
        tier: 2,
        hint: hintText,
        cost: 2,
        hint_cost: 2,
        total_cost: 3,
        next_tier_available: false,
        next_tier_cost: 0,
        message: msg,
      };
    } else {
      const hintText = task.bilingual?.hint_tier2[targetLocale] || task.hint_tier2;
      const msg = targetLocale === "en-US"
        ? "All clues are currently unlocked."
        : "所有线索已处于解锁状态。";
      res = {
        session_id: session.sessionId,
        trial_index: session.currentTrialIndex,
        tier: 2,
        hint: hintText,
        cost: 0,
        total_cost: session.hintsCostForCurrentTrial,
        next_tier_available: false,
        next_tier_cost: 0,
        message: msg,
      };
    }

    this.saveActiveSession(session);
    return res;
  }

  async requestHintAsync(sessionId: string, locale?: SupportedLocale): Promise<any> {
    await this.getSessionAsync(sessionId);
    const res = this.requestHint(sessionId, locale);
    const session = this.getSession(sessionId);
    if (session) {
      await this.saveActiveSessionAsync(session);
    }
    return res;
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
      if (action === MetacognitiveAction.HIGH_BET) conf = 0.95;
      else if (action === MetacognitiveAction.SAFE_BET) conf = 0.50;
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

    // Update Staircase using first-order objective correctness.
    // If Tier 2 deep hint was unlocked before Phase 1 choice was made, damp 2-up advancement.
    const heavyHintBeforeP1 = session.hintsUnlockedBeforeP1 >= 2;
    const newDelta = session.staircase.update(isP1Correct, heavyHintBeforeP1);

    if (session.currentTrialIndex >= session.totalTrials) {
      session.isCompleted = true;
      session.currentPhase = PhaseType.COMPLETED;
      session.currentTask = null;
      const finalReport = this.finalizeReport(session);
      this.removeActiveSession(session.sessionId);

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
    session.hintsUnlockedBeforeP1 = 0;
    session.hintsCostForCurrentTrial = 0;
    session.currentTask = session.taskGenerator.generate(session.currentTrialIndex, newDelta);
    this.saveActiveSession(session);

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

  async submitPhase2Async(
    sessionId: string,
    action: MetacognitiveAction,
    confidenceLevel?: number,
    revisedChoice?: string,
    metricsPayload?: {
      duration_ms?: number;
      token_usage?: TokenUsageStats;
      operations?: any[];
    }
  ): Promise<any> {
    await this.getSessionAsync(sessionId);
    const res = this.submitPhase2(sessionId, action, confidenceLevel, revisedChoice, metricsPayload);
    const session = this.getSession(sessionId);
    if (session) {
      if (session.isCompleted) {
        await this.persistCompletedSessionAsync(session);
        await this.removeActiveSessionAsync(session.sessionId);
      } else {
        await this.saveActiveSessionAsync(session);
      }
    }
    return res;
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

  async processStepAsync(res: TrialResponse): Promise<any> {
    await this.submitPhase1Async(res.session_id, res.phase_1_response.selected_option);
    return this.submitPhase2Async(
      res.session_id,
      res.phase_2_metacognitive_action.action,
      res.phase_2_metacognitive_action.confidence_level,
      res.phase_2_metacognitive_action.revised_option,
      res.trial_metrics
    );
  }

  private localizeReport(report: FinalAssessmentReport, locale?: SupportedLocale): FinalAssessmentReport {
    const targetLocale = locale || getLocale();
    const archetype = report.diagnostic_profile.archetype;
    const def = getArchetypeDefinition(archetype, targetLocale);
    const weakness = ReportGenerator.diagnoseWeakness(
      report.metacognitive_metrics,
      archetype,
      report.diagnostic_profile.risk_attitude,
      targetLocale
    );

    return {
      ...report,
      diagnostic_profile: {
        ...report.diagnostic_profile,
        role_title: def.role_title,
        english_title: def.english_title,
        quadrant_code: def.quadrant_code,
        praise_tagline: def.praise_tagline,
        strength_tags: def.strength_tags,
        empowering_feedback: def.empowering_feedback,
        growth_advice: def.growth_advice,
        skills: def.skills,
        clinical_summary: def.clinical_summary,
        critical_weakness: weakness,
      },
    };
  }

  finalizeReport(session: SessionState, locale?: SupportedLocale): FinalAssessmentReport {
    if (session.finalReport) return this.localizeReport(session.finalReport, locale);

    const dStar = session.staircase.computeDStar(undefined, session.warmupTrials);
    const metrics = PsychometricScorer.evaluate(session.records, true, dStar);
    const targetLocale = locale || session.metadata?.locale || getLocale();
    const report = ReportGenerator.generateReport(
      session.sessionId,
      session.subjectType,
      session.records,
      metrics,
      session.score,
      session.staircase.reversalCount,
      session.subjectName,
      targetLocale
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

    // Persist to completed_sessions
    try {
      const evalRecords = session.records.filter(r => !r.is_warmup);
      const target = evalRecords.length > 0 ? evalRecords : session.records;
      const firstAcc = target.filter(r => r.is_correct_first_order).length / target.length;
      const secondAcc = PsychometricScorer.computeMetacognitiveJudgmentAccuracy(target);

      const insertSql = `
        INSERT OR REPLACE INTO completed_sessions
        (id, name, subject_type, first_order_accuracy, second_order_accuracy, d_prime, meta_d_prime, m_ratio, calibration_bias, final_score, created_at, role_title, quadrant_code, full_report_json, d_star, ive, clinical_summary, total_duration_ms, persona, thinking_effort, token_usage_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
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
      ];

      if (this.storage.runSync) {
        this.storage.runSync(insertSql, params);
      } else {
        this.storage.run(insertSql, params).catch((e) => console.warn("Error persisting session to DB:", e));
      }
      this.removeActiveSession(session.sessionId);
    } catch (e) {
      console.warn("Error persisting session to DB:", e);
    }

    return report;
  }

  public async persistCompletedSessionAsync(session: SessionState): Promise<void> {
    const report = session.finalReport || this.finalizeReport(session);
    const evalRecords = session.records.filter(r => !r.is_warmup);
    const target = evalRecords.length > 0 ? evalRecords : session.records;
    const firstAcc = target.length > 0 ? target.filter(r => r.is_correct_first_order).length / target.length : 0;
    const secondAcc = PsychometricScorer.computeMetacognitiveJudgmentAccuracy(target);
    const metrics = report.metacognitive_metrics;

    const insertSql = `
      INSERT OR REPLACE INTO completed_sessions
      (id, name, subject_type, first_order_accuracy, second_order_accuracy, d_prime, meta_d_prime, m_ratio, calibration_bias, final_score, created_at, role_title, quadrant_code, full_report_json, d_star, ive, clinical_summary, total_duration_ms, persona, thinking_effort, token_usage_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
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
    ];
    await this.storage.run(insertSql, params);
  }

  async finalizeReportAsync(session: SessionState, locale?: SupportedLocale): Promise<FinalAssessmentReport> {
    const report = this.finalizeReport(session, locale);
    await this.persistCompletedSessionAsync(session);
    await this.removeActiveSessionAsync(session.sessionId);
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
          const updateSql = `
            UPDATE completed_sessions
            SET full_report_json = ?,
                total_duration_ms = COALESCE(?, total_duration_ms),
                persona = COALESCE(?, persona),
                thinking_effort = COALESCE(?, thinking_effort),
                token_usage_json = COALESCE(?, token_usage_json)
            WHERE id = ?
          `;
          const params = [
            JSON.stringify(session.finalReport),
            session.metadata.total_duration_ms ?? null,
            session.metadata.persona ?? null,
            session.metadata.thinking_effort ?? null,
            session.metadata.token_usage ? JSON.stringify(session.metadata.token_usage) : null,
            sessionId
          ];
          if (this.storage.runSync) {
            this.storage.runSync(updateSql, params);
          } else {
            this.storage.run(updateSql, params).catch((e) => console.warn(e));
          }
        } catch (e) {
          console.warn("Error updating session metadata in DB:", e);
        }
        return session.finalReport;
      } else {
        this.saveActiveSession(session);
        return undefined;
      }
    } else {
      const rows = this.storage.querySync
        ? this.storage.querySync<any>("SELECT * FROM completed_sessions WHERE id = ?", [sessionId])
        : [];
      const row = rows[0];
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
          const updateSql = `
            UPDATE completed_sessions
            SET full_report_json = ?,
                total_duration_ms = COALESCE(?, total_duration_ms),
                persona = COALESCE(?, persona),
                thinking_effort = COALESCE(?, thinking_effort),
                token_usage_json = COALESCE(?, token_usage_json)
            WHERE id = ?
          `;
          const params = [
            JSON.stringify(rep),
            rep.metadata?.total_duration_ms ?? null,
            rep.metadata?.persona ?? null,
            rep.metadata?.thinking_effort ?? null,
            rep.metadata?.token_usage ? JSON.stringify(rep.metadata.token_usage) : null,
            sessionId
          ];
          if (this.storage.runSync) {
            this.storage.runSync(updateSql, params);
          } else {
            this.storage.run(updateSql, params).catch((e) => console.warn(e));
          }
          return rep;
        } catch (e) {
          console.warn("Error updating DB session metadata:", e);
        }
      }
    }
    return undefined;
  }

  async updateSessionMetadataAsync(sessionId: string, metadata: Partial<SessionExecutionMetadata>): Promise<FinalAssessmentReport | undefined> {
    const session = await this.getSessionAsync(sessionId);
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
        const updateSql = `
          UPDATE completed_sessions
          SET full_report_json = ?,
              total_duration_ms = COALESCE(?, total_duration_ms),
              persona = COALESCE(?, persona),
              thinking_effort = COALESCE(?, thinking_effort),
              token_usage_json = COALESCE(?, token_usage_json)
          WHERE id = ?
        `;
        const params = [
          JSON.stringify(session.finalReport),
          session.metadata.total_duration_ms ?? null,
          session.metadata.persona ?? null,
          session.metadata.thinking_effort ?? null,
          session.metadata.token_usage ? JSON.stringify(session.metadata.token_usage) : null,
          sessionId
        ];
        await this.storage.run(updateSql, params);
        return session.finalReport;
      } else {
        await this.saveActiveSessionAsync(session);
        return undefined;
      }
    } else {
      const rows = await this.storage.query<any>("SELECT * FROM completed_sessions WHERE id = ?", [sessionId]);
      const row = rows[0];
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
          const updateSql = `
            UPDATE completed_sessions
            SET full_report_json = ?,
                total_duration_ms = COALESCE(?, total_duration_ms),
                persona = COALESCE(?, persona),
                thinking_effort = COALESCE(?, thinking_effort),
                token_usage_json = COALESCE(?, token_usage_json)
            WHERE id = ?
          `;
          const params = [
            JSON.stringify(rep),
            rep.metadata?.total_duration_ms ?? null,
            rep.metadata?.persona ?? null,
            rep.metadata?.thinking_effort ?? null,
            rep.metadata?.token_usage ? JSON.stringify(rep.metadata.token_usage) : null,
            sessionId
          ];
          await this.storage.run(updateSql, params);
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
    this.removeActiveSession(sessionId);
    let changes = 0;
    if (this.storage.runSync) {
      const res = this.storage.runSync("DELETE FROM completed_sessions WHERE id = ?", [sessionId]);
      changes = res?.changes ?? 0;
    } else {
      this.storage.run("DELETE FROM completed_sessions WHERE id = ?", [sessionId])
        .then((r) => { changes = r?.changes ?? 0; })
        .catch((e) => console.warn(e));
    }
    return changes > 0;
  }

  async deleteSessionAsync(sessionId: string): Promise<boolean> {
    this.sessions.delete(sessionId);
    await this.removeActiveSessionAsync(sessionId);
    const res = await this.storage.run("DELETE FROM completed_sessions WHERE id = ?", [sessionId]);
    return (res?.changes ?? 0) > 0;
  }

  getReport(sessionId: string, locale?: SupportedLocale): FinalAssessmentReport {
    const session = this.getSession(sessionId);
    if (session && session.finalReport) {
      return this.localizeReport(session.finalReport, locale);
    }
    if (session && session.isCompleted) {
      return this.finalizeReport(session, locale);
    }

    // Try reading from DB
    const rows = this.storage.querySync
      ? this.storage.querySync<any>("SELECT * FROM completed_sessions WHERE id = ?", [sessionId])
      : [];
    const row = rows[0];
    if (row) {
      return this.formatStoredReport(row, locale);
    }

    throw new Error(`Report for session '${sessionId}' is not available.`);
  }

  async getReportAsync(sessionId: string, locale?: SupportedLocale): Promise<FinalAssessmentReport> {
    const session = await this.getSessionAsync(sessionId);
    if (session && session.finalReport) {
      return this.localizeReport(session.finalReport, locale);
    }
    if (session && session.isCompleted) {
      return this.finalizeReportAsync(session, locale);
    }

    const rows = await this.storage.query<any>("SELECT * FROM completed_sessions WHERE id = ?", [sessionId]);
    const row = rows[0];
    if (row) {
      return this.formatStoredReport(row, locale);
    }

    throw new Error(`Report for session '${sessionId}' is not available.`);
  }

  private formatStoredReport(row: any, locale?: SupportedLocale): FinalAssessmentReport {
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

      const hintsCount = ReportGenerator.countHintTrials(parsed.records, true);

      // 动态根据 v2 超平面重新归纳画像，彻底消除历史遗留旧画像漂移
      const archetype = classifyCognitiveArchetype({
        dStar: dStarVal,
        dPrime: dPrimeVal,
        mRatio: mRatioVal,
        bias: biasVal,
        brier: brierVal,
        ive: iveVal,
        hintsCount,
      });
      parsed.diagnostic_profile.archetype = archetype;

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
      return this.localizeReport(parsed, locale);
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
      row.name || "受测者",
      locale
    );
  }

  getCohortScatterData(currentSessionId?: string, locale?: SupportedLocale): CohortScatterResponse {
    const targetLocale = locale || getLocale();
    const rows = (this.storage.querySync
      ? this.storage.querySync("SELECT * FROM completed_sessions ORDER BY created_at DESC")
      : []) as any[];
    return this.assembleCohortScatter(rows, currentSessionId, targetLocale);
  }

  async getCohortScatterDataAsync(currentSessionId?: string, locale?: SupportedLocale): Promise<CohortScatterResponse> {
    const targetLocale = locale || getLocale();
    const rows = (await this.storage.query("SELECT * FROM completed_sessions ORDER BY created_at DESC")) as any[];
    return this.assembleCohortScatter(rows, currentSessionId, targetLocale);
  }

  private assembleCohortScatter(rows: any[], currentSessionId: string | undefined, targetLocale: SupportedLocale): CohortScatterResponse {
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
          if (parsed.records && Array.isArray(parsed.records)) {
            hintsCount = ReportGenerator.countHintTrials(parsed.records, true);
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
      const def = getArchetypeDefinition(archetype, targetLocale);

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
        praise_tagline: def.praise_tagline,
        clinical_summary: def.clinical_summary,
        d_star: dStar,
        ive: ive,
        info_buying_efficiency: ive,
        brier_score: brier,
        cognitive_manifold_vector: [dStar, mRatio, bias, ive],
        coachability_index: Math.round((Math.min(1.0, Math.max(0.0, mRatio)) * 0.45 + Math.max(0.0, 1.0 - Math.abs(bias) * 2.5) * 0.35 + ive * 0.20) * 100),
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
        const dStar = active.staircase.computeDStar(undefined, active.warmupTrials);
        const metrics = PsychometricScorer.evaluate(active.records, true, dStar);
        const hintsCount = ReportGenerator.countHintTrials(active.records, true);

        const archetype = classifyCognitiveArchetype({
          dStar: metrics.d_star,
          dPrime: metrics.d_prime,
          mRatio: metrics.m_ratio,
          bias: metrics.calibration_bias,
          brier: metrics.brier_score,
          ive: metrics.info_buying_efficiency,
          hintsCount,
        });
        const def = getArchetypeDefinition(archetype, targetLocale);

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
          role_title: def.role_title,
          quadrant_code: def.quadrant_code,
          praise_tagline: def.praise_tagline,
          d_star: metrics.d_star,
          ive: metrics.info_buying_efficiency,
          cognitive_manifold_vector: metrics.cognitive_manifold_vector,
          clinical_summary: def.clinical_summary,
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
