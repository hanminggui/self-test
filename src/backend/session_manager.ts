/**
 * Module 2: Metacognitive Protocol Engine and State Machine (session_manager.ts)
 * Orchestrates trial progression, strictly enforces zero feedback leakage,
 * computes wagering payoff matrices, and tracks staircase adaptation across sessions.
 * Uses local persistence for cohort data.
 */

import * as path from "path";
import * as fs from "fs";

import { StorageAdapter, LocalSqliteAdapter, USERS_TABLE_SCHEMA_SQL, getDefaultDatabasePath } from "../storage";
import {
  PhaseType,
  MetacognitiveAction,
  SubjectType,
  TrialRequest,
  TrialRecord,
  FinalAssessmentReport,
  SubjectDataPoint,
  CohortScatterResponse,
  OctantDensityMetrics,
  TrialResponse,
  SessionExecutionMetadata,
  TokenUsageStats,
  RiskAttitude,
  AssessmentMetrics,
  AgentExecutionMetadata,
  DEFAULT_CONFIDENCE_HIGH_BET,
  DEFAULT_CONFIDENCE_SAFE_BET,
} from "./models";
import { StaircaseController, StaircaseSnapshot } from "./staircase";
import { TaskGenerator, GeneratedTask, TaskGeneratorSnapshot } from "./task_generator";
import { PsychometricScorer } from "./metrics";
import { ReportGenerator } from "./report_generator";
import { mapLegacyArchetype, getArchetypeDefinition, classifyCognitiveArchetype } from "./archetype_matrix";
import { compute4AFCdPrime } from "./math";
import { generateSubjectCodename } from "./codename_generator";
import { getLocale, type SupportedLocale } from "../i18n";
import { computeCognitiveSimilarity } from "../frontend/utils/manifoldUtils";

export interface CohortScatterOptions {
  budgetPerOctant?: number;
  scope?: string;
  currentUserId?: string | null;
  filterUserIds?: string[];
  friendUserIds?: string[];
}

export interface SessionState {
  sessionId: string;
  userId?: string | null;
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
        const resolvedDbPath = storageOrDbPath || getDefaultDatabasePath();
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
  }

  getStorage(): StorageAdapter {
    return this.storage;
  }

  private persistTrialRecord(sessionId: string, record: TrialRecord, subjectType: string): void {
    const sql = `
      INSERT OR REPLACE INTO session_records (
        session_id, trial_index, is_warmup, difficulty_level, stimulus_id,
        correct_option, first_order_choice, is_correct_first_order, revised_choice,
        is_correct_final, action, confidence_level, hints_unlocked, score_delta,
        duration_ms, agent_trace_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const isHuman = subjectType === SubjectType.HUMAN;
    const agentTrace = !isHuman && (record.token_usage || record.operations)
      ? JSON.stringify({ token_usage: record.token_usage, operations: record.operations })
      : null;
    const params = [
      sessionId,
      record.trial_index,
      record.is_warmup ? 1 : 0,
      record.difficulty_level,
      record.stimulus_id,
      record.correct_option,
      record.first_order_choice,
      record.is_correct_first_order ? 1 : 0,
      record.revised_choice ?? null,
      record.is_correct_final ? 1 : 0,
      record.action,
      record.confidence_level,
      record.hints_unlocked ?? 0,
      record.score_delta,
      record.duration_ms ?? null,
      agentTrace,
    ];

    if (this.storage.runSync) {
      this.storage.runSync(sql, params);
    } else {
      this.storage.run(sql, params).catch((e) => console.warn("Error persisting trial record:", e));
    }
  }

  private async persistTrialRecordAsync(sessionId: string, record: TrialRecord, subjectType: string): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO session_records (
        session_id, trial_index, is_warmup, difficulty_level, stimulus_id,
        correct_option, first_order_choice, is_correct_first_order, revised_choice,
        is_correct_final, action, confidence_level, hints_unlocked, score_delta,
        duration_ms, agent_trace_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const isHuman = subjectType === SubjectType.HUMAN;
    const agentTrace = !isHuman && (record.token_usage || record.operations)
      ? JSON.stringify({ token_usage: record.token_usage, operations: record.operations })
      : null;
    const params = [
      sessionId,
      record.trial_index,
      record.is_warmup ? 1 : 0,
      record.difficulty_level,
      record.stimulus_id,
      record.correct_option,
      record.first_order_choice,
      record.is_correct_first_order ? 1 : 0,
      record.revised_choice ?? null,
      record.is_correct_final ? 1 : 0,
      record.action,
      record.confidence_level,
      record.hints_unlocked ?? 0,
      record.score_delta,
      record.duration_ms ?? null,
      agentTrace,
    ];
    await this.storage.run(sql, params);
  }

  public saveActiveSession(session: SessionState): void {
    if (session.isCompleted) return;
    const sql = `
      INSERT OR REPLACE INTO active_sessions (
        id, subject_type, subject_name, locale, total_trials, warmup_trials,
        current_trial_index, current_phase, score, staircase_state_json,
        task_generator_state_json, current_task_json,
        is_completed, staged_p1_choice, hint_revealed, hints_unlocked,
        hints_unlocked_before_p1, hints_cost, created_at, start_time_ms,
        agent_metadata_json, updated_at, user_id, referrer_session_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const isHuman = session.subjectType === SubjectType.HUMAN && !session.metadata?.persona;
    const agentMetadata = (!isHuman && session.metadata) ? JSON.stringify(session.metadata) : null;
    const locale = session.metadata?.locale || getLocale();
    const referrerId = session.metadata?.referrer_session_id || null;

    const params = [
      session.sessionId,
      session.subjectType,
      session.subjectName,
      locale,
      session.totalTrials,
      session.warmupTrials,
      session.currentTrialIndex,
      session.currentPhase,
      session.score,
      JSON.stringify(session.staircase.toJSON()),
      JSON.stringify(session.taskGenerator.getState()),
      session.currentTask ? JSON.stringify(session.currentTask) : null,
      session.isCompleted ? 1 : 0,
      session.stagedP1Choice,
      session.hintRevealedForCurrentTrial ? 1 : 0,
      session.hintsUnlockedForCurrentTrial,
      session.hintsUnlockedBeforeP1,
      session.hintsCostForCurrentTrial,
      session.createdAt,
      session.startTimeMs,
      agentMetadata,
      new Date().toISOString(),
      session.userId ?? null,
      referrerId,
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
        id, subject_type, subject_name, locale, total_trials, warmup_trials,
        current_trial_index, current_phase, score, staircase_state_json,
        task_generator_state_json, current_task_json,
        is_completed, staged_p1_choice, hint_revealed, hints_unlocked,
        hints_unlocked_before_p1, hints_cost, created_at, start_time_ms,
        agent_metadata_json, updated_at, user_id, referrer_session_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const isHuman = session.subjectType === SubjectType.HUMAN && !session.metadata?.persona;
    const agentMetadata = (!isHuman && session.metadata) ? JSON.stringify(session.metadata) : null;
    const locale = session.metadata?.locale || getLocale();
    const referrerId = session.metadata?.referrer_session_id || null;

    const params = [
      session.sessionId,
      session.subjectType,
      session.subjectName,
      locale,
      session.totalTrials,
      session.warmupTrials,
      session.currentTrialIndex,
      session.currentPhase,
      session.score,
      JSON.stringify(session.staircase.toJSON()),
      JSON.stringify(session.taskGenerator.getState()),
      session.currentTask ? JSON.stringify(session.currentTask) : null,
      session.isCompleted ? 1 : 0,
      session.stagedP1Choice,
      session.hintRevealedForCurrentTrial ? 1 : 0,
      session.hintsUnlockedForCurrentTrial,
      session.hintsUnlockedBeforeP1,
      session.hintsCostForCurrentTrial,
      session.createdAt,
      session.startTimeMs,
      agentMetadata,
      new Date().toISOString(),
      session.userId ?? null,
      referrerId,
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

  private mapRecordRow(r: any): TrialRecord {
    let tokenUsage = undefined;
    let operations = undefined;
    if (r.agent_trace_json) {
      try {
        const parsed = JSON.parse(r.agent_trace_json);
        tokenUsage = parsed.token_usage;
        operations = parsed.operations;
      } catch {}
    }
    return {
      trial_index: r.trial_index,
      is_warmup: Boolean(r.is_warmup),
      difficulty_level: r.difficulty_level,
      stimulus_id: r.stimulus_id,
      correct_option: r.correct_option,
      first_order_choice: r.first_order_choice,
      is_correct_first_order: Boolean(r.is_correct_first_order),
      revised_choice: r.revised_choice ?? null,
      is_correct_final: Boolean(r.is_correct_final),
      action: r.action as MetacognitiveAction,
      confidence_level: r.confidence_level,
      hints_unlocked: r.hints_unlocked ?? 0,
      score_delta: r.score_delta,
      duration_ms: r.duration_ms ?? undefined,
      token_usage: tokenUsage,
      operations: operations,
    };
  }

  private restoreSessionFromRow(row: any, records: TrialRecord[] = []): SessionState {
    const sc = StaircaseController.fromJSON(JSON.parse(row.staircase_state_json));
    const tg = TaskGenerator.fromState(JSON.parse(row.task_generator_state_json));
    const currentTask = row.current_task_json ? TaskGenerator.reviveTask(JSON.parse(row.current_task_json)) : null;
    let metadata: SessionExecutionMetadata | undefined = undefined;
    if (row.agent_metadata_json) {
      try { metadata = JSON.parse(row.agent_metadata_json); } catch {}
    }
    if (row.locale) {
      if (!metadata) {
        metadata = { locale: row.locale };
      } else if (!metadata.locale) {
        metadata.locale = row.locale;
      }
    }
    if (row.referrer_session_id) {
      if (!metadata) {
        metadata = { referrer_session_id: row.referrer_session_id };
      } else {
        metadata.referrer_session_id = row.referrer_session_id;
      }
    }

    const restored: SessionState = {
      sessionId: row.id,
      userId: row.user_id ?? null,
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
        const recRows = this.storage.querySync<any>(
          "SELECT * FROM session_records WHERE session_id = ? ORDER BY trial_index ASC",
          [sessionId]
        );
        const records = (recRows || []).map(r => this.mapRecordRow(r));
        return this.restoreSessionFromRow(rows[0], records);
      }
    }
    return undefined;
  }

  public async loadActiveSessionAsync(sessionId: string): Promise<SessionState | undefined> {
    const rows = await this.storage.query<any>("SELECT * FROM active_sessions WHERE id = ?", [sessionId]);
    if (rows && rows.length > 0) {
      const recRows = await this.storage.query<any>(
        "SELECT * FROM session_records WHERE session_id = ? ORDER BY trial_index ASC",
        [sessionId]
      );
      const records = (recRows || []).map(r => this.mapRecordRow(r));
      return this.restoreSessionFromRow(rows[0], records);
    }
    return undefined;
  }

  static generateRandomCodename(): string {
    return generateSubjectCodename();
  }

  createSession(params: {
    sessionId?: string;
    userId?: string | null;
    referrerSessionId?: string | null;
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
    const referrerId = params.referrerSessionId || params.metadata?.referrer_session_id || null;

    const staircase = new StaircaseController(initialDelta, 0.08, 0.05, 0.85, 3, warmupTrials, 0.18);
    const taskGenerator = new TaskGenerator(params.seed);
    const initialTask = taskGenerator.generate(1, staircase.getCurrentDelta());

    const now = new Date();
    const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const startTimeMs = Date.now();

    let sessionMetadata: SessionExecutionMetadata | undefined = undefined;
    if (subjectType !== SubjectType.HUMAN || params.persona || params.thinkingEffort) {
      sessionMetadata = {
        model_name: params.metadata?.model_name || (subjectType !== SubjectType.HUMAN ? sName : undefined),
        persona: params.persona || params.metadata?.persona,
        thinking_effort: params.thinkingEffort || params.metadata?.thinking_effort,
        evaluation_mode: params.metadata?.evaluation_mode,
        total_trials: totalTrials,
        completed_trials: 0,
        warmup_trials: warmupTrials,
        token_usage: params.metadata?.token_usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          cached_tokens: 0,
          reasoning_tokens: 0,
          total_tokens: 0,
        },
        locale: params.metadata?.locale || getLocale(),
        ...(referrerId ? { referrer_session_id: referrerId } : {}),
        ...(params.metadata || {}),
      };
    } else if (params.metadata || referrerId) {
      sessionMetadata = {
        locale: params.metadata?.locale || getLocale(),
        ...(referrerId ? { referrer_session_id: referrerId } : {}),
        ...(params.metadata || {}),
      };
    }

    const session: SessionState = {
      sessionId: sid,
      userId: params.userId ?? null,
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
    userId?: string | null;
    referrerSessionId?: string | null;
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
    },
    locale?: SupportedLocale
  ): any {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session '${sessionId}' not found.`);
    if (session.isCompleted) {
      return {
        session_id: session.sessionId,
        trial_index: session.currentTrialIndex,
        status: "COMPLETED",
        is_completed: true,
        report: session.finalReport ? this.localizeReport(session.finalReport, locale) : this.finalizeReport(session, locale),
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
      if (action === MetacognitiveAction.HIGH_BET) conf = DEFAULT_CONFIDENCE_HIGH_BET;
      else if (action === MetacognitiveAction.SAFE_BET) conf = DEFAULT_CONFIDENCE_SAFE_BET;
      else conf = DEFAULT_CONFIDENCE_SAFE_BET;
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

    const isWarmup = session.currentTrialIndex <= session.warmupTrials;
    if (!isWarmup) {
      session.score += scoreDelta;
    }

    const record: TrialRecord = {
      trial_index: session.currentTrialIndex,
      difficulty_level: task.difficulty_level,
      stimulus_id: task.stimulus_id,
      correct_option: task.correct_option,
      first_order_choice: p1Choice,
      is_correct_first_order: isP1Correct,
      action,
      confidence_level: conf,
      hints_unlocked: session.hintsUnlockedForCurrentTrial,
      revised_choice: hintBought ? finalChoice : null,
      is_correct_final: isFinalCorrect,
      score_delta: scoreDelta,
      is_warmup: isWarmup,
      duration_ms: metricsPayload?.duration_ms,
      token_usage: metricsPayload?.token_usage,
      operations: metricsPayload?.operations,
    };
    session.records.push(record);
    this.persistTrialRecord(session.sessionId, record, session.subjectType);

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

    // Update Staircase using first-order objective correctness with two-stage adaptive engine
    const newDelta = session.staircase.update(isP1Correct, isWarmup);

    if (session.currentTrialIndex >= session.totalTrials) {
      session.isCompleted = true;
      session.currentPhase = PhaseType.COMPLETED;
      session.currentTask = null;
      const finalReport = this.finalizeReport(session, locale);
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
    },
    locale?: SupportedLocale
  ): Promise<any> {
    await this.getSessionAsync(sessionId);
    const res = this.submitPhase2(sessionId, action, confidenceLevel, revisedChoice, metricsPayload, locale);
    const session = this.getSession(sessionId);
    if (session) {
      const latestRec = session.records[session.records.length - 1];
      if (latestRec) {
        await this.persistTrialRecordAsync(session.sessionId, latestRec, session.subjectType);
      }
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
    if (!report.diagnostic_profile) return report;
    const archetype = report.diagnostic_profile.archetype;
    const def = getArchetypeDefinition(archetype, targetLocale);
    const weakness = ReportGenerator.diagnoseWeakness(
      report.metacognitive_metrics || (report.metrics as any),
      archetype,
      report.diagnostic_profile.risk_attitude,
      targetLocale
    );

    return {
      ...report,
      diagnostic_profile: {
        ...report.diagnostic_profile,
        archetype,
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
    const rawMetrics = PsychometricScorer.evaluate(session.records, true, dStar);
    const targetLocale = locale || session.metadata?.locale || getLocale();

    // 纯净正式试次计分 (热身轮 100% 隔离不计分)
    const formalScore = session.records
      .filter(r => !r.is_warmup)
      .reduce((sum, r) => sum + (r.score_delta || 0), 0);
    session.score = formalScore;

    const report = ReportGenerator.generateReport(
      session.sessionId,
      session.subjectType,
      session.records,
      rawMetrics,
      session.score,
      session.staircase.reversalCount,
      session.subjectName,
      targetLocale
    );

    report.total_duration_ms = session.startTimeMs ? Date.now() - session.startTimeMs : (session.metadata?.total_duration_ms ?? 0);
    report.user_id = session.userId ?? null;
    report.avatar_url = (session.metadata as any)?.avatar_url ?? null;
    report.referrer_session_id = session.metadata?.referrer_session_id ?? null;
    report.records = session.records;

    // Agent metadata: populated ONLY when subjectType !== SubjectType.HUMAN
    if (session.subjectType !== SubjectType.HUMAN && session.metadata) {
      report.agent_metadata = {
        model_name: session.metadata.model_name || session.subjectName,
        persona: session.metadata.persona,
        thinking_effort: session.metadata.thinking_effort,
        evaluation_mode: session.metadata.evaluation_mode,
        token_usage: session.metadata.token_usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          cached_tokens: 0,
          reasoning_tokens: 0,
          total_tokens: 0,
        },
      };
    } else {
      report.agent_metadata = undefined;
    }

    if (session.metadata) {
      session.metadata.completed_trials = session.records.length;
      if (!session.metadata.total_duration_ms && session.startTimeMs) {
        session.metadata.total_duration_ms = Date.now() - session.startTimeMs;
      }
      report.metadata = session.metadata;
    }

    session.finalReport = report;
    this.persistCompletedSession(session);
    this.removeActiveSession(session.sessionId);
    return report;
  }

  public persistCompletedSession(session: SessionState): void {
    const report = session.finalReport || this.finalizeReport(session);
    const metrics = report.metrics;
    const referrerId = report.referrer_session_id || session.metadata?.referrer_session_id || null;

    const insertSql = `
      INSERT OR REPLACE INTO completed_sessions (
        id, subject_name, subject_type, locale, total_trials, warmup_trials,
        completed_trials, total_duration_ms, final_score, quadrant_code,
        first_order_accuracy, second_order_accuracy, reversals_count,
        d_star, d_prime, meta_d_prime, m_ratio, calibration_bias,
        brier_score, ive, coachability_index, risk_attitude, created_at, user_id, referrer_session_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      report.session_id,
      report.subject_name,
      report.subject_type,
      report.locale,
      report.total_trials,
      report.warmup_trials,
      report.completed_trials,
      report.total_duration_ms,
      report.final_score,
      report.quadrant_code,
      metrics.first_order_accuracy,
      metrics.second_order_accuracy,
      metrics.reversals_count,
      metrics.d_star,
      metrics.d_prime,
      metrics.meta_d_prime,
      metrics.m_ratio,
      metrics.calibration_bias,
      metrics.brier_score,
      metrics.ive,
      metrics.coachability_index,
      metrics.risk_attitude,
      session.createdAt,
      session.userId ?? null,
      referrerId,
    ];

    if (this.storage.runSync) {
      this.storage.runSync(insertSql, params);
      for (const rec of session.records) {
        this.persistTrialRecord(session.sessionId, rec, session.subjectType);
      }
      if (session.subjectType !== SubjectType.HUMAN && report.agent_metadata) {
        const ag = report.agent_metadata;
        const agSql = `
          INSERT OR REPLACE INTO session_agent_metadata (
            session_id, model_name, persona, thinking_effort, evaluation_mode,
            prompt_tokens, completion_tokens, cached_tokens, reasoning_tokens, total_tokens
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        this.storage.runSync(agSql, [
          report.session_id,
          ag.model_name,
          ag.persona ?? null,
          ag.thinking_effort ?? null,
          ag.evaluation_mode ?? null,
          ag.token_usage.prompt_tokens,
          ag.token_usage.completion_tokens,
          ag.token_usage.cached_tokens,
          ag.token_usage.reasoning_tokens,
          ag.token_usage.total_tokens,
        ]);
      }
    } else {
      this.storage.run(insertSql, params).catch((e) => console.warn("Error persisting completed session:", e));
      for (const rec of session.records) {
        this.persistTrialRecord(session.sessionId, rec, session.subjectType);
      }
      if (session.subjectType !== SubjectType.HUMAN && report.agent_metadata) {
        const ag = report.agent_metadata;
        const agSql = `
          INSERT OR REPLACE INTO session_agent_metadata (
            session_id, model_name, persona, thinking_effort, evaluation_mode,
            prompt_tokens, completion_tokens, cached_tokens, reasoning_tokens, total_tokens
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        this.storage.run(agSql, [
          report.session_id,
          ag.model_name,
          ag.persona ?? null,
          ag.thinking_effort ?? null,
          ag.evaluation_mode ?? null,
          ag.token_usage.prompt_tokens,
          ag.token_usage.completion_tokens,
          ag.token_usage.cached_tokens,
          ag.token_usage.reasoning_tokens,
          ag.token_usage.total_tokens,
        ]).catch(() => {});
      }
    }
    this.removeActiveSession(session.sessionId);
  }

  public async persistCompletedSessionAsync(session: SessionState): Promise<void> {
    const report = session.finalReport || this.finalizeReport(session);
    const metrics = report.metrics;
    const referrerId = report.referrer_session_id || session.metadata?.referrer_session_id || null;

    const insertSql = `
      INSERT OR REPLACE INTO completed_sessions (
        id, subject_name, subject_type, locale, total_trials, warmup_trials,
        completed_trials, total_duration_ms, final_score, quadrant_code,
        first_order_accuracy, second_order_accuracy, reversals_count,
        d_star, d_prime, meta_d_prime, m_ratio, calibration_bias,
        brier_score, ive, coachability_index, risk_attitude, created_at, user_id, referrer_session_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      report.session_id,
      report.subject_name,
      report.subject_type,
      report.locale,
      report.total_trials,
      report.warmup_trials,
      report.completed_trials,
      report.total_duration_ms,
      report.final_score,
      report.quadrant_code,
      metrics.first_order_accuracy,
      metrics.second_order_accuracy,
      metrics.reversals_count,
      metrics.d_star,
      metrics.d_prime,
      metrics.meta_d_prime,
      metrics.m_ratio,
      metrics.calibration_bias,
      metrics.brier_score,
      metrics.ive,
      metrics.coachability_index,
      metrics.risk_attitude,
      session.createdAt,
      session.userId ?? null,
      referrerId,
    ];
    await this.storage.run(insertSql, params);

    for (const rec of session.records) {
      await this.persistTrialRecordAsync(session.sessionId, rec, session.subjectType);
    }

    if (session.subjectType !== SubjectType.HUMAN && report.agent_metadata) {
      const ag = report.agent_metadata;
      const agSql = `
        INSERT OR REPLACE INTO session_agent_metadata (
          session_id, model_name, persona, thinking_effort, evaluation_mode,
          prompt_tokens, completion_tokens, cached_tokens, reasoning_tokens, total_tokens
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await this.storage.run(agSql, [
        report.session_id,
        ag.model_name,
        ag.persona ?? null,
        ag.thinking_effort ?? null,
        ag.evaluation_mode ?? null,
        ag.token_usage.prompt_tokens,
        ag.token_usage.completion_tokens,
        ag.token_usage.cached_tokens,
        ag.token_usage.reasoning_tokens,
        ag.token_usage.total_tokens,
      ]);
    }
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
        if (session.subjectType !== SubjectType.HUMAN) {
          session.finalReport.agent_metadata = {
            model_name: session.metadata.model_name || session.subjectName,
            persona: session.metadata.persona,
            thinking_effort: session.metadata.thinking_effort,
            evaluation_mode: session.metadata.evaluation_mode,
            token_usage: session.metadata.token_usage || {
              prompt_tokens: 0,
              completion_tokens: 0,
              cached_tokens: 0,
              reasoning_tokens: 0,
              total_tokens: 0,
            },
          };
          const ag = session.finalReport.agent_metadata;
          const agSql = `
            INSERT OR REPLACE INTO session_agent_metadata (
              session_id, model_name, persona, thinking_effort, evaluation_mode,
              prompt_tokens, completion_tokens, cached_tokens, reasoning_tokens, total_tokens
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          if (this.storage.runSync) {
            this.storage.runSync(agSql, [
              sessionId,
              ag.model_name,
              ag.persona ?? null,
              ag.thinking_effort ?? null,
              ag.evaluation_mode ?? null,
              ag.token_usage.prompt_tokens,
              ag.token_usage.completion_tokens,
              ag.token_usage.cached_tokens,
              ag.token_usage.reasoning_tokens,
              ag.token_usage.total_tokens,
            ]);
          } else {
            this.storage.run(agSql, [
              sessionId,
              ag.model_name,
              ag.persona ?? null,
              ag.thinking_effort ?? null,
              ag.evaluation_mode ?? null,
              ag.token_usage.prompt_tokens,
              ag.token_usage.completion_tokens,
              ag.token_usage.cached_tokens,
              ag.token_usage.reasoning_tokens,
              ag.token_usage.total_tokens,
            ]).catch(() => {});
          }
        }
        if (session.metadata.total_duration_ms) {
          session.finalReport.total_duration_ms = session.metadata.total_duration_ms;
          const durSql = "UPDATE completed_sessions SET total_duration_ms = ? WHERE id = ?";
          if (this.storage.runSync) {
            this.storage.runSync(durSql, [session.metadata.total_duration_ms, sessionId]);
          } else {
            this.storage.run(durSql, [session.metadata.total_duration_ms, sessionId]).catch(() => {});
          }
        }
        if (metadata.locale) {
          session.metadata.locale = metadata.locale;
          session.finalReport.locale = metadata.locale;
          const locSql = "UPDATE completed_sessions SET locale = ? WHERE id = ?";
          if (this.storage.runSync) {
            this.storage.runSync(locSql, [metadata.locale, sessionId]);
          } else {
            this.storage.run(locSql, [metadata.locale, sessionId]).catch(() => {});
          }
        }
        return session.finalReport;
      } else {
        this.saveActiveSession(session);
        return undefined;
      }
    }
    return undefined;
  }

  async updateSessionMetadataAsync(sessionId: string, metadata: Partial<SessionExecutionMetadata>): Promise<FinalAssessmentReport | undefined> {
    return this.updateSessionMetadata(sessionId, metadata);
  }

  deleteSession(sessionId: string): boolean {
    this.sessions.delete(sessionId);
    this.removeActiveSession(sessionId);
    let changes = 0;
    if (this.storage.runSync) {
      this.storage.runSync("DELETE FROM session_records WHERE session_id = ?", [sessionId]);
      this.storage.runSync("DELETE FROM session_agent_metadata WHERE session_id = ?", [sessionId]);
      this.storage.runSync("DELETE FROM active_sessions WHERE id = ?", [sessionId]);
      const res = this.storage.runSync("DELETE FROM completed_sessions WHERE id = ?", [sessionId]);
      changes = res?.changes ?? 0;
    } else {
      this.storage.run("DELETE FROM session_records WHERE session_id = ?", [sessionId]).catch(() => {});
      this.storage.run("DELETE FROM session_agent_metadata WHERE session_id = ?", [sessionId]).catch(() => {});
      this.storage.run("DELETE FROM active_sessions WHERE id = ?", [sessionId]).catch(() => {});
      this.storage.run("DELETE FROM completed_sessions WHERE id = ?", [sessionId])
        .then((r) => { changes = r?.changes ?? 0; })
        .catch((e) => console.warn(e));
    }
    return changes > 0;
  }

  async deleteSessionAsync(sessionId: string): Promise<boolean> {
    this.sessions.delete(sessionId);
    await this.removeActiveSessionAsync(sessionId);
    await this.storage.run("DELETE FROM session_records WHERE session_id = ?", [sessionId]);
    await this.storage.run("DELETE FROM session_agent_metadata WHERE session_id = ?", [sessionId]);
    await this.storage.run("DELETE FROM active_sessions WHERE id = ?", [sessionId]);
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

    if (this.storage.querySync) {
      const rows = this.storage.querySync<any>("SELECT * FROM completed_sessions WHERE id = ?", [sessionId]);
      const row = rows[0];
      if (row) {
        const recRows = this.storage.querySync<any>(
          "SELECT * FROM session_records WHERE session_id = ? ORDER BY trial_index ASC",
          [sessionId]
        );
        const records = (recRows || []).map((r) => this.mapRecordRow(r));
        const agentRows = this.storage.querySync<any>(
          "SELECT * FROM session_agent_metadata WHERE session_id = ?",
          [sessionId]
        );
        return this.formatStoredReportFromDb(row, records, agentRows[0], locale);
      }
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
      const recRows = await this.storage.query<any>(
        "SELECT * FROM session_records WHERE session_id = ? ORDER BY trial_index ASC",
        [sessionId]
      );
      const records = (recRows || []).map((r) => this.mapRecordRow(r));
      const agentRows = await this.storage.query<any>(
        "SELECT * FROM session_agent_metadata WHERE session_id = ?",
        [sessionId]
      );
      return this.formatStoredReportFromDb(row, records, agentRows[0], locale);
    }

    throw new Error(`Report for session '${sessionId}' is not available.`);
  }

  private formatStoredReportFromDb(row: any, records: TrialRecord[], agentRow: any, locale?: SupportedLocale): FinalAssessmentReport {
    const targetLocale = locale || row.locale || getLocale();
    const quadrantCode = row.quadrant_code || "Q1-CAL";
    const archetypeDef = getArchetypeDefinition(quadrantCode, targetLocale);
    const archetype = archetypeDef.archetype;

    // 历史存量数据平滑向后兼容：若包含试次记录，则重算纯净正式分
    const formalScore = records && records.length > 0
      ? records.filter(r => !r.is_warmup).reduce((sum, r) => sum + (r.score_delta || 0), 0)
      : (row.final_score ?? 0);
    const dStarVal = row.d_star ?? 0.50;
    const ccs = Math.round(dStarVal * formalScore * 100) / 100;

    const metrics: AssessmentMetrics = {
      first_order_accuracy: row.first_order_accuracy ?? 0.7,
      second_order_accuracy: row.second_order_accuracy ?? 0.7,
      reversals_count: row.reversals_count ?? 0,
      d_star: dStarVal,
      d_prime: row.d_prime ?? 1.2,
      meta_d_prime: row.meta_d_prime ?? 1.1,
      m_ratio: row.m_ratio ?? 0.9,
      calibration_bias: row.calibration_bias ?? 0.0,
      brier_score: row.brier_score ?? 0.20,
      ive: row.ive ?? 0.50,
      coachability_index: row.coachability_index ?? 50,
      risk_attitude: (row.risk_attitude as RiskAttitude) || RiskAttitude.MODERATE_RATIONAL,
      formal_score: formalScore,
      composite_cognitive_score: ccs,
      ccs,
    };

    let agentMetadata: AgentExecutionMetadata | undefined = undefined;
    if (row.subject_type !== SubjectType.HUMAN && agentRow) {
      agentMetadata = {
        model_name: agentRow.model_name || row.subject_name,
        persona: agentRow.persona,
        thinking_effort: agentRow.thinking_effort,
        evaluation_mode: agentRow.evaluation_mode,
        token_usage: {
          prompt_tokens: agentRow.prompt_tokens ?? 0,
          completion_tokens: agentRow.completion_tokens ?? 0,
          cached_tokens: agentRow.cached_tokens ?? 0,
          reasoning_tokens: agentRow.reasoning_tokens ?? 0,
          total_tokens: agentRow.total_tokens ?? 0,
        },
      };
    }

    let legacyMetadata: SessionExecutionMetadata | undefined = undefined;
    if (agentMetadata) {
      legacyMetadata = {
        model_name: agentMetadata.model_name,
        persona: agentMetadata.persona,
        thinking_effort: agentMetadata.thinking_effort,
        evaluation_mode: agentMetadata.evaluation_mode,
        token_usage: agentMetadata.token_usage,
        total_trials: row.total_trials ?? records.length,
        completed_trials: row.completed_trials ?? records.length,
        warmup_trials: row.warmup_trials ?? 10,
        total_duration_ms: row.total_duration_ms ?? 0,
        locale: targetLocale,
      };
    }

    const report: FinalAssessmentReport = {
      session_id: row.id,
      subject_name: row.subject_name || row.name || "受测者",
      subject_type: row.subject_type,
      avatar_url: row.avatar_url || (legacyMetadata as any)?.avatar_url || null,
      locale: targetLocale,
      created_at: row.created_at,
      total_trials: row.total_trials ?? records.length,
      warmup_trials: row.warmup_trials ?? 10,
      completed_trials: row.completed_trials ?? records.length,
      total_duration_ms: row.total_duration_ms ?? 0,
      final_score: formalScore,
      formal_score: formalScore,
      composite_cognitive_score: ccs,
      ccs,
      quadrant_code: quadrantCode,
      archetype,
      metrics,
      agent_metadata: agentMetadata,
      metadata: legacyMetadata,
      records,
      user_id: row.user_id ?? null,
      referrer_session_id: row.referrer_session_id ?? null,

      // Transitional wrappers
      summary: {
        total_trials: row.total_trials ?? records.length,
        first_order_accuracy: row.first_order_accuracy ?? 0.7,
        final_score: formalScore,
        formal_score: formalScore,
        composite_cognitive_score: ccs,
        ccs,
        reversals_count: row.reversals_count ?? 0,
        d_star: dStarVal,
      },
      metacognitive_metrics: {
        d_prime: row.d_prime ?? 1.2,
        meta_d_prime: row.meta_d_prime ?? 1.1,
        m_ratio: row.m_ratio ?? 0.9,
        calibration_bias: row.calibration_bias ?? 0.0,
        brier_score: row.brier_score ?? 0.20,
        ive: row.ive ?? 0.50,
        info_buying_efficiency: row.ive ?? 0.50,
        d_star: row.d_star ?? 0.5,
      },
      diagnostic_profile: {
        archetype,
        risk_attitude: (row.risk_attitude as RiskAttitude) || RiskAttitude.MODERATE_RATIONAL,
        critical_weakness: ReportGenerator.diagnoseWeakness(metrics as any, archetype, row.risk_attitude, targetLocale),
        coachability_index: row.coachability_index ?? 50,
        clinical_summary: archetypeDef.clinical_summary,
        detailed_feedback: archetypeDef.empowering_feedback,
        role_title: archetypeDef.role_title,
        english_title: archetypeDef.english_title,
        quadrant_code: archetypeDef.quadrant_code,
        praise_tagline: archetypeDef.praise_tagline,
        strength_tags: archetypeDef.strength_tags,
        empowering_feedback: archetypeDef.empowering_feedback,
        growth_advice: archetypeDef.growth_advice,
        skills: archetypeDef.skills,
      },
    };

    return report;
  }

  public static readonly ALL_OCTANT_CODES = [
    "Q1-CAL",
    "Q2-EVO",
    "Q3-SEN",
    "Q4-PIO",
    "Q5-RET",
    "Q6-GAM",
    "Q7-ARB",
    "Q8-DRI",
  ] as const;

  private static readonly OCTANT_AGGREGATE_SQL = `
    SELECT 
      COALESCE(c.quadrant_code, 'Q1-CAL') as quadrant_code,
      COUNT(*) as count,
      AVG(c.d_star) as avg_d_star,
      AVG(c.m_ratio) as avg_m_ratio,
      AVG(c.final_score) as avg_score,
      MAX(0.0, AVG(c.d_star * c.d_star) - AVG(c.d_star) * AVG(c.d_star)) as var_d_star,
      MAX(0.0, AVG(c.m_ratio * c.m_ratio) - AVG(c.m_ratio) * AVG(c.m_ratio)) as var_m_ratio,
      MAX(0.0, AVG(c.final_score * c.final_score) - AVG(c.final_score) * AVG(c.final_score)) as var_score
    FROM completed_sessions c
    GROUP BY COALESCE(c.quadrant_code, 'Q1-CAL')
  `;

  private static readonly FALLBACK_SESSIONS_SQL = `
    SELECT 
      c.*,
      u.display_name as user_display_name,
      u.avatar_url as user_avatar_url,
      a.model_name as agent_model,
      a.persona as agent_persona,
      a.thinking_effort as agent_effort,
      a.evaluation_mode as agent_eval_mode,
      a.prompt_tokens,
      a.completion_tokens,
      a.cached_tokens,
      a.reasoning_tokens,
      a.total_tokens
    FROM completed_sessions c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN session_agent_metadata a ON c.id = a.session_id
    ORDER BY c.created_at DESC
  `;

  private static readonly SPATIAL_SAMPLING_CTE_SQL = `
    WITH BucketRanked AS (
      SELECT 
        c.*,
        COALESCE(c.quadrant_code, 'Q1-CAL') as norm_quadrant_code,
        NTILE(?) OVER (
          PARTITION BY COALESCE(c.quadrant_code, 'Q1-CAL') 
          ORDER BY COALESCE(c.d_star, 0.5) ASC, COALESCE(c.m_ratio, 0.8) ASC
        ) as spatial_bucket
      FROM completed_sessions c
    ),
    RankedWithinBucket AS (
      SELECT 
        b.*,
        ROW_NUMBER() OVER (
          PARTITION BY b.norm_quadrant_code, b.spatial_bucket 
          ORDER BY 
            CASE WHEN b.id = ? THEN 0 ELSE 1 END,
            b.created_at DESC
        ) as bucket_rank
      FROM BucketRanked b
    )
    SELECT 
      r.*,
      u.display_name as user_display_name,
      u.avatar_url as user_avatar_url,
      a.model_name as agent_model,
      a.persona as agent_persona,
      a.thinking_effort as agent_effort,
      a.evaluation_mode as agent_eval_mode,
      a.prompt_tokens,
      a.completion_tokens,
      a.cached_tokens,
      a.reasoning_tokens,
      a.total_tokens
    FROM RankedWithinBucket r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN session_agent_metadata a ON r.id = a.session_id
    WHERE r.bucket_rank = 1
    ORDER BY r.norm_quadrant_code ASC, r.spatial_bucket ASC
  `;

  getCohortScatterData(
    currentSessionId?: string,
    locale?: SupportedLocale,
    options?: CohortScatterOptions
  ): CohortScatterResponse {
    const targetLocale = locale || getLocale();
    const rawBudget = options?.budgetPerOctant;
    const budget =
      typeof rawBudget === "number" && Number.isFinite(rawBudget)
        ? Math.max(8, Math.min(12, Math.floor(rawBudget)))
        : 10;

    if (options?.filterUserIds) {
      if (options.filterUserIds.length === 0) {
        return this.buildCohortScatterResponse([], [], currentSessionId, targetLocale, budget, false, options);
      }
      const placeholders = options.filterUserIds.map(() => "?").join(",");
      const filterSql = `
        SELECT 
          c.*,
          u.display_name as user_display_name,
          u.avatar_url as user_avatar_url,
          a.model_name as agent_model,
          a.persona as agent_persona,
          a.thinking_effort as agent_effort,
          a.evaluation_mode as agent_eval_mode,
          a.prompt_tokens,
          a.completion_tokens,
          a.cached_tokens,
          a.reasoning_tokens,
          a.total_tokens
        FROM completed_sessions c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN session_agent_metadata a ON c.id = a.session_id
        WHERE c.user_id IN (${placeholders})
        ORDER BY c.created_at DESC
      `;
      const rows = (this.storage.querySync ? this.storage.querySync(filterSql, options.filterUserIds) : []) || [];
      return this.buildCohortScatterResponse([], rows, currentSessionId, targetLocale, budget, false, options);
    }

    let aggRows: any[] = [];
    let sampledRows: any[] = [];
    let usedSqlSampling = false;

    if (this.storage.querySync) {
      try {
        aggRows = this.storage.querySync(SessionManager.OCTANT_AGGREGATE_SQL) || [];
        sampledRows =
          this.storage.querySync(SessionManager.SPATIAL_SAMPLING_CTE_SQL, [budget, currentSessionId || ""]) || [];
        usedSqlSampling = true;
      } catch {
        sampledRows = (this.storage.querySync ? this.storage.querySync(SessionManager.FALLBACK_SESSIONS_SQL) : []) || [];
      }
    }

    return this.buildCohortScatterResponse(aggRows, sampledRows, currentSessionId, targetLocale, budget, usedSqlSampling, options);
  }

  async getCohortScatterDataAsync(
    currentSessionId?: string,
    locale?: SupportedLocale,
    options?: CohortScatterOptions
  ): Promise<CohortScatterResponse> {
    const targetLocale = locale || getLocale();
    const rawBudget = options?.budgetPerOctant;
    const budget =
      typeof rawBudget === "number" && Number.isFinite(rawBudget)
        ? Math.max(8, Math.min(12, Math.floor(rawBudget)))
        : 10;

    if (options?.filterUserIds) {
      if (options.filterUserIds.length === 0) {
        return this.buildCohortScatterResponse([], [], currentSessionId, targetLocale, budget, false, options);
      }
      const placeholders = options.filterUserIds.map(() => "?").join(",");
      const filterSql = `
        SELECT 
          c.*,
          u.display_name as user_display_name,
          u.avatar_url as user_avatar_url,
          a.model_name as agent_model,
          a.persona as agent_persona,
          a.thinking_effort as agent_effort,
          a.evaluation_mode as agent_eval_mode,
          a.prompt_tokens,
          a.completion_tokens,
          a.cached_tokens,
          a.reasoning_tokens,
          a.total_tokens
        FROM completed_sessions c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN session_agent_metadata a ON c.id = a.session_id
        WHERE c.user_id IN (${placeholders})
        ORDER BY c.created_at DESC
      `;
      const rows = (await this.storage.query(filterSql, options.filterUserIds)) || [];
      return this.buildCohortScatterResponse([], rows, currentSessionId, targetLocale, budget, false, options);
    }

    let aggRows: any[] = [];
    let sampledRows: any[] = [];
    let usedSqlSampling = false;

    try {
      const [aggs, sampled] = await Promise.all([
        this.storage.query(SessionManager.OCTANT_AGGREGATE_SQL),
        this.storage.query(SessionManager.SPATIAL_SAMPLING_CTE_SQL, [budget, currentSessionId || ""]),
      ]);
      aggRows = aggs || [];
      sampledRows = sampled || [];
      usedSqlSampling = true;
    } catch {
      try {
        sampledRows = (await this.storage.query(SessionManager.FALLBACK_SESSIONS_SQL)) || [];
      } catch {
        sampledRows = [];
      }
    }

    return this.buildCohortScatterResponse(aggRows, sampledRows, currentSessionId, targetLocale, budget, usedSqlSampling, options);
  }

  public getAllCompletedSessions(locale?: SupportedLocale): SubjectDataPoint[] {
    const targetLocale = locale || getLocale();
    if (!this.storage.querySync) return [];
    const rows = (this.storage.querySync(SessionManager.FALLBACK_SESSIONS_SQL) || []) as any[];
    return this.mapRowsToSubjects(rows, undefined, targetLocale);
  }

  public async getAllCompletedSessionsAsync(locale?: SupportedLocale): Promise<SubjectDataPoint[]> {
    const targetLocale = locale || getLocale();
    const rows = ((await this.storage.query(SessionManager.FALLBACK_SESSIONS_SQL)) || []) as any[];
    return this.mapRowsToSubjects(rows, undefined, targetLocale);
  }

  private buildCohortScatterResponse(
    aggRows: any[],
    rows: any[],
    currentSessionId: string | undefined,
    targetLocale: SupportedLocale,
    budgetPerOctant: number,
    usedSqlSampling: boolean,
    options?: CohortScatterOptions
  ): CohortScatterResponse {
    let subjects = this.mapRowsToSubjects(rows, currentSessionId, targetLocale);

    let totalCount = 0;
    let meanX = 0.5;
    let meanY = 0.5;

    if (usedSqlSampling && aggRows.length > 0) {
      for (const r of aggRows) {
        totalCount += Number(r.count || 0);
      }
      if (totalCount > 0) {
        let sumX = 0;
        let sumY = 0;
        for (const r of aggRows) {
          const c = Number(r.count || 0);
          sumX += c * Number(r.avg_d_star ?? 0.5);
          sumY += c * Number(r.avg_m_ratio ?? 0.8);
        }
        meanX = Math.round((sumX / totalCount) * 1000) / 1000;
        meanY = Math.round((sumY / totalCount) * 1000) / 1000;
      }
    } else {
      // In-memory aggregation fallback
      const inMem = this.computeInMemoryAggregates(rows);
      totalCount = inMem.totalCount;
      aggRows = inMem.aggRows;
      meanX = inMem.meanX;
      meanY = inMem.meanY;

      // In-memory spatial sampling if not pre-sampled by SQL and not scoped
      if (!options?.filterUserIds) {
        subjects = this.sampleSubjectsInMemory(subjects, budgetPerOctant, currentSessionId);
      }
    }

    // Check if current session is active in memory and not yet saved
    if (currentSessionId && !subjects.some((s) => s.id === currentSessionId)) {
      const active = this.getSession(currentSessionId);
      if (active && active.records.length > 0) {
        const activeSubject = this.assembleActiveSubject(active, targetLocale);
        subjects.unshift(activeSubject);
        totalCount += 1;
        const foundAgg = aggRows.find((a) => a.quadrant_code === activeSubject.quadrant_code);
        if (foundAgg) {
          foundAgg.count = Number(foundAgg.count || 0) + 1;
        } else {
          aggRows.push({
            quadrant_code: activeSubject.quadrant_code,
            count: 1,
            avg_d_star: activeSubject.metrics.d_star,
            avg_m_ratio: activeSubject.metrics.m_ratio,
            avg_score: activeSubject.final_score,
            var_d_star: 0,
            var_m_ratio: 0,
          });
        }
      }
    }

    // Compute mutual cognitive similarities & friendship flags
    const currentUserId = options?.currentUserId;
    const friendUserIds = options?.friendUserIds || [];

    let selfVector: [number, number, number, number] | undefined;
    if (currentUserId) {
      const selfSub = subjects.find((s) => s.user_id === currentUserId);
      if (selfSub && selfSub.cognitive_manifold_vector) {
        selfVector = selfSub.cognitive_manifold_vector;
      }
    }

    subjects.forEach((s) => {
      const isSelf = Boolean(currentUserId && s.user_id === currentUserId);
      const isFriend = Boolean(s.user_id && friendUserIds.includes(s.user_id));
      s.is_self = isSelf;
      s.is_friend = isFriend;

      if (isSelf) {
        s.similarity = 100;
        s.similarity_percentage = 100;
      } else if (selfVector && s.cognitive_manifold_vector) {
        const sim = computeCognitiveSimilarity(selfVector, s.cognitive_manifold_vector);
        s.similarity = sim;
        s.similarity_percentage = sim;
      }
    });

    const octantStats = this.buildOctantDensityStats(aggRows, totalCount);

    let varX = 0;
    let varY = 0;
    if (totalCount > 0) {
      let sumXSq = 0;
      let sumYSq = 0;
      for (const r of aggRows) {
        const c = Number(r.count || 0);
        const meanD = Number(r.avg_d_star ?? 0.5);
        const varD = Number(r.var_d_star ?? 0);
        const meanM = Number(r.avg_m_ratio ?? 0.8);
        const varM = Number(r.var_m_ratio ?? 0);
        sumXSq += c * (varD + meanD * meanD);
        sumYSq += c * (varM + meanM * meanM);
      }
      varX = Math.max(0, Math.round((sumXSq / totalCount - meanX * meanX) * 10000) / 10000);
      varY = Math.max(0, Math.round((sumYSq / totalCount - meanY * meanY) * 10000) / 10000);
    }

    if (subjects.length > 96 && !options?.filterUserIds) {
      subjects = subjects.slice(0, 96);
    }

    const xVals = subjects.map((s) => s.metrics.d_star);
    const yVals = subjects.map((s) => s.metrics.m_ratio);



    const median = (arr: number[]): number => {
      if (arr.length === 0) return 0.5;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    return {
      baseline_x: 0.6,
      baseline_y: 0.8,
      median_x: Math.round(median(xVals) * 1000) / 1000,
      median_y: Math.round(median(yVals) * 1000) / 1000,
      mean_x: meanX,
      mean_y: meanY,
      total_count: totalCount,
      octants: octantStats,
      octant_stats: octantStats,
      density_summary: {
        total_count: totalCount,
        mean_x: meanX,
        mean_y: meanY,
        variance_x: varX,
        variance_y: varY,
      },
      subjects,
    };
  }

  private assembleCohortScatterFromRows(
    rows: any[],
    currentSessionId: string | undefined,
    targetLocale: SupportedLocale
  ): CohortScatterResponse {
    return this.buildCohortScatterResponse([], rows, currentSessionId, targetLocale, 10, false);
  }

  private mapRowsToSubjects(
    rows: any[],
    currentSessionId: string | undefined,
    targetLocale: SupportedLocale
  ): SubjectDataPoint[] {
    return rows.map((r) => this.mapRowToSubjectDataPoint(r, targetLocale, currentSessionId));
  }

  private mapRowToSubjectDataPoint(
    r: any,
    targetLocale: SupportedLocale,
    currentSessionId?: string
  ): SubjectDataPoint {
    const quadrantCode = r.quadrant_code || "Q1-CAL";
    const archetypeDef = getArchetypeDefinition(quadrantCode, targetLocale);
    const dStarVal = r.d_star ?? 0.5;
    const formalScore = r.final_score ?? 0;
    const ccs = Math.round(dStarVal * formalScore * 100) / 100;

    const metrics: AssessmentMetrics = {
      first_order_accuracy: r.first_order_accuracy ?? 0.7,
      second_order_accuracy: r.second_order_accuracy ?? 0.7,
      reversals_count: r.reversals_count ?? 0,
      d_star: dStarVal,
      d_prime: r.d_prime ?? 1.2,
      meta_d_prime: r.meta_d_prime ?? 1.1,
      m_ratio: r.m_ratio ?? 0.9,
      calibration_bias: r.calibration_bias ?? 0.0,
      brier_score: r.brier_score ?? 0.2,
      ive: r.ive ?? 0.5,
      coachability_index: r.coachability_index ?? 50,
      risk_attitude: (r.risk_attitude as RiskAttitude) || RiskAttitude.MODERATE_RATIONAL,
      formal_score: formalScore,
      composite_cognitive_score: ccs,
      ccs,
    };

    let agentMetadata: AgentExecutionMetadata | undefined = undefined;
    if (r.subject_type !== SubjectType.HUMAN && r.agent_model) {
      agentMetadata = {
        model_name: r.agent_model,
        persona: r.agent_persona,
        thinking_effort: r.agent_effort,
        evaluation_mode: r.agent_eval_mode,
        token_usage: {
          prompt_tokens: r.prompt_tokens ?? 0,
          completion_tokens: r.completion_tokens ?? 0,
          cached_tokens: r.cached_tokens ?? 0,
          reasoning_tokens: r.reasoning_tokens ?? 0,
          total_tokens: r.total_tokens ?? 0,
        },
      };
    }

    const displayName = r.user_display_name || r.subject_name || r.name || "受测者";
    const avatarUrl = r.user_avatar_url || null;

    return {
      id: r.id,
      name: displayName,
      nickname: displayName,
      avatar_url: avatarUrl,
      subject_type: r.subject_type,
      locale: (r.locale as SupportedLocale) || targetLocale,
      created_at: r.created_at,
      total_trials: r.total_trials ?? 30,
      warmup_trials: r.warmup_trials ?? 10,
      total_duration_ms: r.total_duration_ms ?? 0,
      final_score: formalScore,
      formal_score: formalScore,
      composite_cognitive_score: ccs,
      ccs,
      quadrant_code: quadrantCode,
      is_current: r.id === currentSessionId,
      metrics,
      agent_metadata: agentMetadata,
      user_id: r.user_id ?? null,

      // Legacy fields for backward compatibility
      metadata: {
        locale: (r.locale as SupportedLocale) || targetLocale,
        ...(agentMetadata || {}),
      },
      first_order_accuracy: r.first_order_accuracy,
      second_order_accuracy: r.second_order_accuracy,
      d_prime: r.d_prime,
      meta_d_prime: r.meta_d_prime,
      m_ratio: r.m_ratio,
      calibration_bias: r.calibration_bias,
      d_star: r.d_star,
      ive: r.ive,
      info_buying_efficiency: r.ive,
      brier_score: r.brier_score,
      coachability_index: r.coachability_index,
      role_title: archetypeDef.role_title,
      praise_tagline: archetypeDef.praise_tagline,
      cognitive_manifold_vector: [r.d_star ?? 0.5, r.m_ratio ?? 0.9, r.calibration_bias ?? 0.0, r.ive ?? 0.5],
      clinical_summary: archetypeDef.clinical_summary,
    };
  }

  private assembleActiveSubject(active: SessionState, targetLocale: SupportedLocale): SubjectDataPoint {
    const evalRecords = active.records.filter((r) => !r.is_warmup);
    const target = evalRecords.length > 0 ? evalRecords : active.records;
    const firstAcc = target.filter((r) => r.is_correct_first_order).length / (target.length || 1);
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
      ive: metrics.ive ?? 0.5,
      hintsCount,
    });
    const def = getArchetypeDefinition(archetype, targetLocale);

    const formalScore = active.records
      .filter((r) => !r.is_warmup)
      .reduce((sum, r) => sum + (r.score_delta || 0), 0);
    const ccs = Math.round(metrics.d_star * formalScore * 100) / 100;

    const activeMetrics: AssessmentMetrics = {
      first_order_accuracy: Math.round(firstAcc * 1000) / 1000,
      second_order_accuracy: Math.round(secondAcc * 1000) / 1000,
      reversals_count: active.staircase.reversalCount,
      d_star: metrics.d_star,
      d_prime: metrics.d_prime,
      meta_d_prime: metrics.meta_d_prime,
      m_ratio: metrics.m_ratio,
      calibration_bias: metrics.calibration_bias,
      brier_score: metrics.brier_score,
      ive: metrics.ive,
      info_buying_efficiency: metrics.ive,
      coachability_index: 50,
      risk_attitude: RiskAttitude.MODERATE_RATIONAL,
      formal_score: formalScore,
      composite_cognitive_score: ccs,
      ccs,
    };

    return {
      id: active.sessionId,
      name: active.subjectName,
      subject_type: active.subjectType,
      locale: targetLocale,
      created_at: active.createdAt,
      total_trials: active.totalTrials,
      warmup_trials: active.warmupTrials,
      total_duration_ms: Date.now() - active.startTimeMs,
      final_score: formalScore,
      formal_score: formalScore,
      composite_cognitive_score: ccs,
      ccs,
      quadrant_code: def.quadrant_code,
      is_current: true,
      metrics: activeMetrics,
      user_id: active.userId ?? null,

      // Legacy fields
      first_order_accuracy: activeMetrics.first_order_accuracy,
      second_order_accuracy: activeMetrics.second_order_accuracy,
      d_prime: activeMetrics.d_prime,
      meta_d_prime: activeMetrics.meta_d_prime,
      m_ratio: activeMetrics.m_ratio,
      calibration_bias: activeMetrics.calibration_bias,
      d_star: activeMetrics.d_star,
      ive: activeMetrics.ive,
      info_buying_efficiency: activeMetrics.ive,
      brier_score: activeMetrics.brier_score,
      coachability_index: 50,
      role_title: def.role_title,
      praise_tagline: def.praise_tagline,
      cognitive_manifold_vector: [activeMetrics.d_star, activeMetrics.m_ratio, activeMetrics.calibration_bias, activeMetrics.ive],
      clinical_summary: def.clinical_summary,
    };
  }

  private buildOctantDensityStats(
    aggRows: any[],
    totalCount: number
  ): Record<string, OctantDensityMetrics> {
    const stats: Record<string, OctantDensityMetrics> = {};
    for (const code of SessionManager.ALL_OCTANT_CODES) {
      stats[code] = {
        quadrant_code: code,
        count: 0,
        percentage: "0.0%",
        avg_d_star: 0.5,
        avg_m_ratio: 0.8,
        avg_score: 0,
        variance_d_star: 0,
        variance_m_ratio: 0,
        variance_score: 0,
        avgDStar: "--",
        avgMRatio: "--",
        avgScore: 0,
      };
    }

    for (const r of aggRows) {
      const code = r.quadrant_code || "Q1-CAL";
      const count = Number(r.count || 0);
      const avgDStar = Number(r.avg_d_star ?? 0.5);
      const avgMRatio = Number(r.avg_m_ratio ?? 0.8);
      const avgScore = Math.round(Number(r.avg_score ?? 0));
      const varDStar = Math.max(0, Number(r.var_d_star ?? 0));
      const varMRatio = Math.max(0, Number(r.var_m_ratio ?? 0));
      const varScore = Math.max(0, Number(r.var_score ?? 0));
      const pct = totalCount > 0 ? `${((count / totalCount) * 100).toFixed(1)}%` : "0.0%";

      stats[code] = {
        quadrant_code: code,
        count,
        percentage: pct,
        avg_d_star: Math.round(avgDStar * 10000) / 10000,
        avg_m_ratio: Math.round(avgMRatio * 10000) / 10000,
        avg_score: avgScore,
        variance_d_star: Math.round(varDStar * 10000) / 10000,
        variance_m_ratio: Math.round(varMRatio * 10000) / 10000,
        variance_score: Math.round(varScore * 100) / 100,
        avgDStar: count > 0 ? avgDStar.toFixed(3) : "--",
        avgMRatio: count > 0 ? avgMRatio.toFixed(2) : "--",
        avgScore,
      };
    }

    return stats;
  }

  private computeInMemoryAggregates(rows: any[]): {
    totalCount: number;
    aggRows: any[];
    meanX: number;
    meanY: number;
  } {
    const groups: Record<
      string,
      { dStarSum: number; dStarSqSum: number; mRatioSum: number; mRatioSqSum: number; scoreSum: number; scoreSqSum: number; count: number }
    > = {};
    for (const code of SessionManager.ALL_OCTANT_CODES) {
      groups[code] = { dStarSum: 0, dStarSqSum: 0, mRatioSum: 0, mRatioSqSum: 0, scoreSum: 0, scoreSqSum: 0, count: 0 };
    }

    let totalCount = 0;
    let totalDStar = 0;
    let totalMRatio = 0;

    for (const r of rows) {
      const code = r.quadrant_code || "Q1-CAL";
      if (!groups[code]) {
        groups[code] = { dStarSum: 0, dStarSqSum: 0, mRatioSum: 0, mRatioSqSum: 0, scoreSum: 0, scoreSqSum: 0, count: 0 };
      }
      const dStar = Number(r.d_star ?? 0.5);
      const mRatio = Number(r.m_ratio ?? 0.8);
      const score = Number(r.final_score ?? 0);
      const g = groups[code];
      g.count += 1;
      g.dStarSum += dStar;
      g.dStarSqSum += dStar * dStar;
      g.mRatioSum += mRatio;
      g.mRatioSqSum += mRatio * mRatio;
      g.scoreSum += score;
      g.scoreSqSum += score * score;

      totalCount += 1;
      totalDStar += dStar;
      totalMRatio += mRatio;
    }

    const aggRows = Object.entries(groups).map(([code, g]) => {
      const c = g.count;
      const avgDStar = c > 0 ? g.dStarSum / c : 0.5;
      const avgMRatio = c > 0 ? g.mRatioSum / c : 0.8;
      const avgScore = c > 0 ? g.scoreSum / c : 0;
      const varDStar = c > 0 ? Math.max(0, g.dStarSqSum / c - avgDStar * avgDStar) : 0;
      const varMRatio = c > 0 ? Math.max(0, g.mRatioSqSum / c - avgMRatio * avgMRatio) : 0;
      const varScore = c > 0 ? Math.max(0, g.scoreSqSum / c - avgScore * avgScore) : 0;
      return {
        quadrant_code: code,
        count: c,
        avg_d_star: avgDStar,
        avg_m_ratio: avgMRatio,
        avg_score: avgScore,
        var_d_star: varDStar,
        var_m_ratio: varMRatio,
        var_score: varScore,
      };
    });

    return {
      totalCount,
      aggRows,
      meanX: totalCount > 0 ? Math.round((totalDStar / totalCount) * 1000) / 1000 : 0.5,
      meanY: totalCount > 0 ? Math.round((totalMRatio / totalCount) * 1000) / 1000 : 0.5,
    };
  }

  private sampleSubjectsInMemory(
    subjects: SubjectDataPoint[],
    budgetPerOctant: number,
    currentSessionId?: string
  ): SubjectDataPoint[] {
    const result: SubjectDataPoint[] = [];

    for (const code of SessionManager.ALL_OCTANT_CODES) {
      const octSubjects = subjects.filter((s) => (s.quadrant_code || "Q1-CAL") === code);
      if (octSubjects.length <= budgetPerOctant) {
        result.push(...octSubjects);
        continue;
      }

      // Sort by d_star, m_ratio to prepare quantile spatial buckets
      octSubjects.sort((a, b) => {
        const dDiff = (a.metrics.d_star ?? 0.5) - (b.metrics.d_star ?? 0.5);
        if (Math.abs(dDiff) > 1e-5) return dDiff;
        return (a.metrics.m_ratio ?? 0.8) - (b.metrics.m_ratio ?? 0.8);
      });

      const bucketSize = octSubjects.length / budgetPerOctant;
      for (let b = 0; b < budgetPerOctant; b++) {
        const startIdx = Math.floor(b * bucketSize);
        const endIdx = Math.min(octSubjects.length, Math.floor((b + 1) * bucketSize));
        const slice = octSubjects.slice(startIdx, endIdx);
        if (slice.length === 0) continue;

        const curr = slice.find((s) => s.id === currentSessionId);
        if (curr) {
          result.push(curr);
        } else {
          result.push(slice[Math.floor(slice.length / 2)]);
        }
      }
    }

    if (currentSessionId && !result.some((s) => s.id === currentSessionId)) {
      const found = subjects.find((s) => s.id === currentSessionId);
      if (found) {
        result.unshift(found);
      }
    }

    return result;
  }

  public getUserSessions(userId: string, locale?: SupportedLocale): SubjectDataPoint[] {
    const targetLocale = locale || getLocale();
    if (!this.storage.querySync) return [];
    const sql = `
      SELECT 
        c.*,
        a.model_name as agent_model,
        a.persona as agent_persona,
        a.thinking_effort as agent_effort,
        a.evaluation_mode as agent_eval_mode,
        a.prompt_tokens,
        a.completion_tokens,
        a.cached_tokens,
        a.reasoning_tokens,
        a.total_tokens
      FROM completed_sessions c
      LEFT JOIN session_agent_metadata a ON c.id = a.session_id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `;
    const rows = this.storage.querySync(sql, [userId]) as any[];
    return this.assembleCohortScatterFromRows(rows, undefined, targetLocale).subjects;
  }

  public async getUserSessionsAsync(userId: string, locale?: SupportedLocale): Promise<SubjectDataPoint[]> {
    const targetLocale = locale || getLocale();
    const sql = `
      SELECT 
        c.*,
        a.model_name as agent_model,
        a.persona as agent_persona,
        a.thinking_effort as agent_effort,
        a.evaluation_mode as agent_eval_mode,
        a.prompt_tokens,
        a.completion_tokens,
        a.cached_tokens,
        a.reasoning_tokens,
        a.total_tokens
      FROM completed_sessions c
      LEFT JOIN session_agent_metadata a ON c.id = a.session_id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `;
    const rows = (await this.storage.query(sql, [userId])) as any[];
    return this.assembleCohortScatterFromRows(rows, undefined, targetLocale).subjects;
  }

  public async claimGuestSessionsAsync(
    userId: string,
    sessionIds: string[],
    locale?: SupportedLocale
  ): Promise<{ claimed: string[]; sessions: SubjectDataPoint[] }> {
    const cleanIds = Array.from(
      new Set((sessionIds || []).map((id) => String(id || "").trim()).filter(Boolean))
    );
    const claimed: string[] = [];

    for (const sessionId of cleanIds) {
      // Only claim human sessions that currently have no user_id (or already belong to this user)
      const rows = (await this.storage.query(
        "SELECT id, user_id, subject_type FROM completed_sessions WHERE id = ?",
        [sessionId]
      )) as any[];

      if (rows.length > 0) {
        const row = rows[0];
        const existingUserId = row.user_id;
        if (!existingUserId) {
          await this.storage.run(
            "UPDATE completed_sessions SET user_id = ? WHERE id = ? AND (user_id IS NULL OR user_id = '')",
            [userId, sessionId]
          );
          claimed.push(sessionId);
        } else if (existingUserId === userId) {
          claimed.push(sessionId);
        }
      }

      // Also update in-memory cache if present and unclaimed
      const memSession = this.sessions.get(sessionId);
      if (memSession && (!memSession.userId || memSession.userId === userId)) {
        memSession.userId = userId;
        if (memSession.finalReport) {
          memSession.finalReport.user_id = userId;
        }
      }
    }

    const sessions = await this.getUserSessionsAsync(userId, locale);
    return { claimed, sessions };
  }

  public async getUserCognitiveAssetsAsync(
    userId: string,
    locale?: SupportedLocale
  ): Promise<{
    unlocked_count: number;
    total_archetypes: number;
    assets: Array<{
      quadrant_code: string;
      archetype: string;
      role_title: string;
      english_title: string;
      praise_tagline: string;
      strength_tags: string[];
      empowering_feedback: string;
      skills: any[];
      unlocked: boolean;
      count: number;
      best_d_prime: number | null;
      best_m_ratio: number | null;
      latest_session_id: string | null;
      latest_unlocked_at: string | null;
    }>;
  }> {
    const targetLocale = locale || getLocale();
    const userSessions = await this.getUserSessionsAsync(userId, targetLocale);
    const canonicalCodes = [
      "Q1-CAL",
      "Q2-EVO",
      "Q3-SEN",
      "Q4-PIO",
      "Q5-RET",
      "Q6-GAM",
      "Q7-ARB",
      "Q8-DRI",
    ];

    const assets = canonicalCodes.map((code) => {
      const def = getArchetypeDefinition(code, targetLocale);
      const matching = userSessions.filter((s) => (s.quadrant_code || "Q1-CAL") === code);
      const unlocked = matching.length > 0;
      const bestDPrime = unlocked
        ? Math.max(...matching.map((s) => s.d_prime ?? s.metrics?.d_prime ?? 0))
        : null;
      const bestMRatio = unlocked
        ? Math.max(...matching.map((s) => s.m_ratio ?? s.metrics?.m_ratio ?? 0))
        : null;
      const latest = matching[0] || null;

      return {
        quadrant_code: code,
        archetype: def.archetype,
        role_title: def.role_title,
        english_title: def.english_title,
        praise_tagline: def.praise_tagline,
        strength_tags: def.strength_tags,
        empowering_feedback: def.empowering_feedback,
        skills: def.skills,
        unlocked,
        count: matching.length,
        best_d_prime: bestDPrime !== null ? Math.round(bestDPrime * 100) / 100 : null,
        best_m_ratio: bestMRatio !== null ? Math.round(bestMRatio * 100) / 100 : null,
        latest_session_id: latest ? latest.id : null,
        latest_unlocked_at: latest ? latest.created_at : null,
      };
    });

    const unlockedCount = assets.filter((a) => a.unlocked).length;
    return {
      unlocked_count: unlockedCount,
      total_archetypes: canonicalCodes.length,
      assets,
    };
  }
}
