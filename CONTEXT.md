# Metacognitive Testing System

A cognitive psychometrics and adaptive wagering evaluation system that decouples Type-1 task ability from Type-2 metacognitive sensitivity across human and LLM agent subjects.

## Language

**Completed Session (`completed_sessions`)**:
The single, normalized summary row persisted when a subject finishes an assessment. Stores only universal session parameters, unified psychometric metrics (`AssessmentMetrics`), and the canonical `quadrant_code`, with zero localized display text or embedded trial arrays.
_Avoid_: Full report JSON, session dump

**Active Session (`active_sessions`)**:
The transient runtime state of an in-progress assessment, holding the PRNG task generator state, adaptive staircase state, and current trial progress without duplicating completed trial history.

**Trial Record (`session_records`)**:
An individual step record persisted in its own relational table (`session_records`), keyed by `(session_id, trial_index)`. Contains objective stimulus parameters, subject choices, wagering action, hint unlock tier, score delta, duration, and an optional nullable `agent_trace_json` for LLM step telemetry.
_Avoid_: Embedded `records_json`

**Agent Execution Metadata (`session_agent_metadata`)**:
Model-specific execution configuration and cumulative token billing (`model_name`, `persona`, `thinking_effort`, `evaluation_mode`, and token counters) stored in a dedicated 1:1 extension table exclusively for non-human subjects (`LLM_AGENT`, `MOCK_AGENT`). Human sessions never create rows in this table.
_Avoid_: Generic `metadata`, `metadata_json` on human sessions

**Assessment Metrics (`AssessmentMetrics`)**:
The unified, flat mathematical measurement object combining first-order process statistics (`first_order_accuracy`, `second_order_accuracy`, `reversals_count`) and second-order 4D cognitive manifold scalars (`d_star`, `d_prime`, `meta_d_prime`, `m_ratio`, `calibration_bias`, `brier_score`, `ive`, `coachability_index`, `risk_attitude`).
_Avoid_: Split `SessionSummary` and `MetacognitiveMetrics`

**Quadrant Code (`quadrant_code`)**:
The canonical 6-character identifier (`Q1-CAL` through `Q8-DRI`) representing the subject's classified cognitive archetype. Serves as the sole persisted classification key in the database; all human-readable titles, taglines, skills, and clinical summaries are resolved dynamically in memory from the i18n dictionary.
_Avoid_: Persisting `diagnostic_profile`, `role_title`, or `clinical_summary` in the database
