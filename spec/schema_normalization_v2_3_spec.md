# Metacognitive v2.3: Normalized Relational Storage, Zero-i18n Persistence & Unified Metrics Specification

## Problem Statement

The current persistence architecture and domain data structures suffer from five structural flaws that degrade maintainability, bloat storage, and cause i18n state drift:

1. **Monolithic Result & Detail Table (`completed_sessions` + `full_report_json`)**:
   - Single-session summary metrics, localized diagnostic strings, execution metadata, and the entire array of 30–60 per-trial records are all serialized into a single `full_report_json` blob inside `completed_sessions`, duplicating scalar columns (`d_prime`, `meta_d_prime`, `m_ratio`, `calibration_bias`, `d_star`, `ive`, `final_score`, `total_duration_ms`, `persona`, `thinking_effort`).
   - Similarly, `active_sessions` serializes growing trial histories into `records_json` on every step instead of appending rows to a relational detail table.
2. **i18n Display Strings Persisted in the Database (`diagnostic_profile`, `role_title`, `clinical_summary`)**:
   - `completed_sessions` persists locale-dependent text columns (`role_title`, `clinical_summary`) and `full_report_json` embeds the entire `diagnostic_profile` object (`role_title`, `english_title`, `praise_tagline`, `strength_tags`, `empowering_feedback`, `growth_advice`, `skills`, `critical_weakness`, `clinical_summary`).
   - Because all presentation and clinical texts are deterministically derived from `quadrant_code` and the active `locale` via `getArchetypeDefinition(quadrant_code, locale)`, storing them in the database violates separation of concerns and requires workarounds when switching languages.
3. **Human vs. LLM Metadata Contamination (`metadata`)**:
   - Universal session properties (`total_trials`, `warmup_trials`, `completed_trials`, `total_duration_ms`, `locale`) are mixed inside `SessionExecutionMetadata` alongside LLM-only properties (`model_name`, `persona`, `thinking_effort`, `evaluation_mode`, `token_usage`).
   - Worse, when a human subject (`subject_type === "HUMAN"`) starts a session, the system still populates fake LLM metadata (`model_name`, `persona: "标准中性 (零人设)"`, `thinking_effort: "none"`, and zeroed `token_usage`).
4. **Redundant & Split Metric Objects (`summary` vs. `metacognitive_metrics`)**:
   - Dividing metrics across `SessionSummary` and `MetacognitiveMetrics` caused `d_star` to be stored three times (`summary.d_star`, `metacognitive_metrics.d_star`, and DB column `d_star`), persisted the mathematical constant `target_staircase_convergence = 0.7071`, and stored `cognitive_manifold_vector` which merely duplicates `[d_star, m_ratio, calibration_bias, ive]`.
5. **Bloated Step Record Structure (`TrialRecord`)**:
   - `TrialRecord` carries redundant fields: `hint_purchased` (always equivalent to `hints_unlocked > 0`), `hints_cost_total` (deterministically mapped from `hints_unlocked`: `0 -> 0`, `1 -> 1`, `2 -> 3`), and `signal_type` (`"S1" | "S2"`, a legacy 2AFC artifact obsolete in the 4AFC paradigm).

---

## Solution

Re-architect the persistence layer and full-stack TypeScript domain contracts into a clean, normalized **4-table relational schema** with **zero i18n text persistence**, **physical table isolation for LLM agent metadata**, and a **unified `AssessmentMetrics` contract**:

1. **Normalized 4-Table Database Schema (`migrations/0001_init.sql`)**:
   - **`completed_sessions` (Concise Single-Test Result Table)**: Stores only session identity, universal trial configuration/timing (`locale`, `total_trials`, `warmup_trials`, `total_duration_ms`, `final_score`, `created_at`), deduplicated psychometric scalars (`first_order_accuracy`, `second_order_accuracy`, `reversals_count`, `d_star`, `d_prime`, `meta_d_prime`, `m_ratio`, `calibration_bias`, `brier_score`, `ive`, `coachability_index`, `risk_attitude`), and the canonical **`quadrant_code`**. Removes `full_report_json`, `role_title`, `clinical_summary`, `persona`, `thinking_effort`, and `token_usage_json`.
   - **`session_records` (Dedicated Per-Trial Detail Table)**: Stores one row per completed trial keyed by `(session_id, trial_index)` with `ON DELETE CASCADE`. Retains only lean universal columns plus a nullable `agent_trace_json` (populated only for LLM agents to store per-step `token_usage` and `operations`; strictly `NULL` for humans).
   - **`session_agent_metadata` (Dedicated 1:1 LLM Extension Table)**: Stores `session_id` (PK), `model_name`, `persona`, `thinking_effort`, `evaluation_mode`, `prompt_tokens`, `completion_tokens`, `cached_tokens`, `reasoning_tokens`, `total_tokens`. Created **only** when `subject_type !== 'HUMAN'`.
   - **`active_sessions` (In-Progress Runtime State Table)**: Stores active state without `records_json` (completed trials during an active session are written directly to `session_records`) and keeps universal `locale` as a dedicated column while `agent_metadata_json` is `NULL` for humans.
2. **Zero-i18n Persistence & Dynamic Dictionary Resolution**:
   - `diagnostic_profile` is completely removed from database storage and API payloads. Only `quadrant_code` (and its 1:1 `archetype` enum) is persisted and returned.
   - Frontend views (`App.tsx`, `SubjectDetailDrawer.tsx`, `PosterModal.tsx`, `Admin.tsx`) and CLI reporters resolve `role_title`, `praise_tagline`, `skills`, `empowering_feedback`, `growth_advice`, `critical_weakness`, and `clinical_summary` directly from `getArchetypeDefinition(quadrant_code, locale)`.
3. **Flattened `AssessmentMetrics` Contract**:
   - Replace `summary` and `metacognitive_metrics` with a single flat `metrics: AssessmentMetrics` object on `FinalAssessmentReport`, eliminating duplicate `d_star`, `target_staircase_convergence`, and `cognitive_manifold_vector`.
4. **Legacy Migration & Recalibration Cleanup**:
   - Rebuild `migrations/0001_init.sql` cleanly and remove the legacy `migrateFromLegacyJson` and `recalibrateHistoricalSessions` workarounds from `SessionManager`.

---

## User Stories

1. As a system architect, I want `completed_sessions` to store only concise, normalized session attributes, `quadrant_code`, and scalar metrics without `full_report_json`, so that every column has a single source of truth and zero redundancy.
2. As a database administrator, I want per-trial step records stored in a dedicated `session_records` table with foreign-key cascade deletion, so that trial-level queries, audits, and session deletions operate cleanly without parsing giant JSON blobs.
3. As a domain modeler, I want `TrialRecord` stripped of redundant fields (`hint_purchased`, `hints_cost_total`, `signal_type`), so that each trial row stores only irreducible facts.
4. As an i18n engineer, I want zero locale-dependent strings (`role_title`, `clinical_summary`, `diagnostic_profile` texts) stored in the database or frozen in API payloads, so that switching between `zh-CN` and `en-US` dynamically reads fresh copy from the system dictionary via `quadrant_code`.
5. As a data scientist comparing human vs. LLM cohorts, I want universal session fields (`locale`, `total_trials`, `warmup_trials`, `completed_trials`, `total_duration_ms`) promoted to the top-level session record and LLM-specific fields (`model_name`, `persona`, `thinking_effort`, `evaluation_mode`, `token_usage`) isolated in `session_agent_metadata`, so that human sessions never contain fake model attributes.
6. As a frontend or CLI consumer of `FinalAssessmentReport`, I want `summary` and `metacognitive_metrics` unified into a single `metrics: AssessmentMetrics` structure with `d_star` appearing once and `ive` standardized, so that metric access is unambiguous across the entire codebase.
7. As a developer running tests on both `LocalSqliteAdapter` (`bun:sqlite`) and `D1StorageAdapter` (Cloudflare D1), I want all 4 tables and cascade/cleanup operations to work identically across both storage engines.

---

## Implementation Decisions

### 1. Target Relational Schema (`migrations/0001_init.sql`)

```sql
-- 1. Completed Sessions (Concise Single-Test Result Table)
CREATE TABLE IF NOT EXISTS completed_sessions (
  id TEXT PRIMARY KEY,
  subject_name TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'zh-CN',
  total_trials INTEGER NOT NULL,
  warmup_trials INTEGER NOT NULL,
  completed_trials INTEGER NOT NULL,
  total_duration_ms INTEGER NOT NULL DEFAULT 0,
  final_score INTEGER NOT NULL DEFAULT 0,
  quadrant_code TEXT NOT NULL,
  first_order_accuracy REAL NOT NULL,
  second_order_accuracy REAL NOT NULL,
  reversals_count INTEGER NOT NULL DEFAULT 0,
  d_star REAL NOT NULL,
  d_prime REAL NOT NULL,
  meta_d_prime REAL NOT NULL,
  m_ratio REAL NOT NULL,
  calibration_bias REAL NOT NULL,
  brier_score REAL NOT NULL,
  ive REAL NOT NULL,
  coachability_index INTEGER NOT NULL,
  risk_attitude TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 2. Per-Trial Step Detail Table
CREATE TABLE IF NOT EXISTS session_records (
  session_id TEXT NOT NULL,
  trial_index INTEGER NOT NULL,
  is_warmup INTEGER NOT NULL DEFAULT 0,
  difficulty_level REAL NOT NULL,
  stimulus_id TEXT NOT NULL,
  correct_option TEXT NOT NULL,
  first_order_choice TEXT NOT NULL,
  is_correct_first_order INTEGER NOT NULL,
  revised_choice TEXT,
  is_correct_final INTEGER NOT NULL,
  action TEXT NOT NULL,
  confidence_level REAL NOT NULL,
  hints_unlocked INTEGER NOT NULL DEFAULT 0,
  score_delta INTEGER NOT NULL,
  duration_ms INTEGER,
  agent_trace_json TEXT,
  PRIMARY KEY (session_id, trial_index),
  FOREIGN KEY (session_id) REFERENCES completed_sessions(id) ON DELETE CASCADE
);

-- 3. Model-Only Execution Metadata Table (1:1 Extension, NULL/absent for HUMAN)
CREATE TABLE IF NOT EXISTS session_agent_metadata (
  session_id TEXT PRIMARY KEY,
  model_name TEXT NOT NULL,
  persona TEXT,
  thinking_effort TEXT,
  evaluation_mode TEXT,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  cached_tokens INTEGER NOT NULL DEFAULT 0,
  reasoning_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (session_id) REFERENCES completed_sessions(id) ON DELETE CASCADE
);

-- 4. Active In-Progress Sessions Table
CREATE TABLE IF NOT EXISTS active_sessions (
  id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'zh-CN',
  total_trials INTEGER NOT NULL,
  warmup_trials INTEGER NOT NULL,
  current_trial_index INTEGER NOT NULL,
  current_phase TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  staircase_state_json TEXT NOT NULL,
  task_generator_state_json TEXT NOT NULL,
  current_task_json TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0,
  staged_p1_choice TEXT,
  hint_revealed INTEGER NOT NULL DEFAULT 0,
  hints_unlocked INTEGER NOT NULL DEFAULT 0,
  hints_unlocked_before_p1 INTEGER NOT NULL DEFAULT 0,
  hints_cost INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  start_time_ms INTEGER NOT NULL,
  agent_metadata_json TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_completed_sessions_created_at ON completed_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_completed_sessions_quadrant ON completed_sessions(quadrant_code);
CREATE INDEX IF NOT EXISTS idx_session_records_session_id ON session_records(session_id, trial_index ASC);
CREATE INDEX IF NOT EXISTS idx_active_sessions_updated_at ON active_sessions(updated_at DESC);
```

> **Note on Foreign Keys & Deletion**: Because SQLite `PRAGMA foreign_keys` may vary across D1/SQLite connections and `session_records` rows are also written during active sessions before the `completed_sessions` row exists, `session_records` should index `(session_id, trial_index)` without a strict blocking FK constraint on `completed_sessions` during active steps, and `deleteSession` / `deleteSessionAsync` will explicitly delete from `session_records`, `session_agent_metadata`, `active_sessions`, and `completed_sessions` to guarantee 100% deterministic cleanup across both local SQLite and Cloudflare D1.

### 2. Core TypeScript Domain Contracts (`src/backend/models.ts`)

```typescript
export interface AgentTrialTrace {
  token_usage?: TokenUsageStats;
  operations?: TrialOperation[];
}

export interface TrialRecord {
  trial_index: number;
  is_warmup: boolean;
  difficulty_level: number;
  stimulus_id: string;
  correct_option: string;
  first_order_choice: string;
  is_correct_first_order: boolean;
  revised_choice: string | null;
  is_correct_final: boolean;
  action: MetacognitiveAction;
  confidence_level: number;
  hints_unlocked: number; // 0, 1, 2 (cost derived as 0, 1, 3; purchased derived as > 0)
  score_delta: number;
  duration_ms?: number;
  // Populated only for LLM_AGENT / MOCK_AGENT trials
  token_usage?: TokenUsageStats;
  operations?: TrialOperation[];
}

export interface AssessmentMetrics {
  first_order_accuracy: number;
  second_order_accuracy: number;
  reversals_count: number;
  d_star: number;
  d_prime: number;
  meta_d_prime: number;
  m_ratio: number;
  calibration_bias: number;
  brier_score: number;
  ive: number;
  coachability_index: number;
  risk_attitude: RiskAttitude;
}

export interface AgentExecutionMetadata {
  model_name: string;
  persona?: string;
  thinking_effort?: string;
  evaluation_mode?: EvaluationMode;
  token_usage: TokenUsageStats;
}

export interface FinalAssessmentReport {
  session_id: string;
  subject_name: string;
  subject_type: string;
  locale: SupportedLocale;
  created_at: string;
  total_trials: number;
  warmup_trials: number;
  completed_trials: number;
  total_duration_ms: number;
  final_score: number;
  quadrant_code: string;
  archetype: CognitiveArchetype;
  metrics: AssessmentMetrics;
  agent_metadata?: AgentExecutionMetadata;
  records?: TrialRecord[];
}

export interface SubjectDataPoint {
  id: string;
  name: string;
  subject_type: string;
  locale: SupportedLocale;
  created_at: string;
  total_trials: number;
  warmup_trials: number;
  total_duration_ms: number;
  final_score: number;
  quadrant_code: string;
  is_current?: boolean;
  metrics: AssessmentMetrics;
  agent_metadata?: AgentExecutionMetadata;
}
```

### 3. Seam & Deep Module Architecture

We will test and verify this refactor at two primary seams:
1. **`SessionManager` Public Interface (`src/backend/session_manager.ts`)**:
   - Exercises the complete lifecycle (`createSession`, `submitPhase1`, `requestHint`, `submitPhase2`, `getReport`, `getCohortScatterData`, `updateSessionMetadata`, `deleteSession`, plus their `*Async` counterparts) backed by both `LocalSqliteAdapter` and simulated `D1StorageAdapter`.
   - Hides the 4-table SQL joins/writes inside `SessionManager` so callers only interact with clean domain objects (`FinalAssessmentReport`, `CohortScatterResponse`).
2. **REST API & Frontend Presentation Seam (`src/backend/server.ts`, `src/frontend/`)**:
   - `GET /api/sessions/:id/report` and `GET /api/cohort/scatter` return the normalized, language-neutral payload (`quadrant_code`, `metrics`, optional `agent_metadata`, `records`), while UI components resolve localized titles, taglines, skills, and clinical truth strings from `getArchetypeDefinition(quadrant_code, locale)`.

---

## Testing Decisions

- **Behavior-focused verification at the `SessionManager` and HTTP API seams**:
  - Verify that completing a `HUMAN` session inserts 1 row into `completed_sessions`, $N$ rows into `session_records`, and **0 rows** into `session_agent_metadata` (and `agent_metadata` is `undefined` on the returned report).
  - Verify that completing an `LLM_AGENT` session inserts 1 row into `completed_sessions`, $N$ rows into `session_records` (with `agent_trace_json` populated), and 1 row into `session_agent_metadata` (with aggregated token billing).
  - Verify that `completed_sessions` contains no `full_report_json`, `role_title`, or `clinical_summary` columns.
  - Verify that active sessions persist step records into `session_records` as each trial completes and can be restored seamlessly across process restarts.
  - Verify that `deleteSession` / `deleteSessionAsync` removes all associated rows across `completed_sessions`, `session_records`, `session_agent_metadata`, and `active_sessions`.
  - Prior art: `tests/storage.test.ts`, `tests/d1_storage.test.ts`, `tests/session.test.ts`, `tests/api.test.ts`, `tests/acceptance.test.ts`.

---

## Out of Scope

- Historical data migration from legacy `0001_init.sql` databases or `persisted_sessions.json` (clean slate schema replacement per Q6 decision).
- Changes to the mathematical formulas of 4AFC $d'$, $\text{Meta-}d'$, $M_{\text{ratio}}$, $\text{Bias}$, $\text{Brier}$, or $\text{IVE}$ in `PsychometricScorer`.
- Changes to the 8-archetype MECE hyperplane classification logic in `classifyCognitiveArchetype`.
