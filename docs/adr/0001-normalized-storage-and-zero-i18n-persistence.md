# Normalized Four-Table Storage Schema and Zero-i18n Persistence

Status: accepted

We are replacing the monolithic `completed_sessions` table (which previously stored `full_report_json`, localized `role_title`/`clinical_summary` strings, and mixed human/LLM metadata) with a normalized four-table relational schema (`completed_sessions`, `session_records`, `session_agent_metadata`, `active_sessions`) and a unified `AssessmentMetrics` contract across the stack:

1. **Zero i18n or Display Text in Database**: Only `quadrant_code` is persisted for archetype classification. All localized presentation strings and clinical descriptions are resolved at read/render time via `getArchetypeDefinition(quadrant_code, locale)`.
2. **Dedicated Step Detail Table (`session_records`)**: Trial steps are stored as individual rows in `session_records` rather than serialized inside `full_report_json` or `records_json`, with redundant fields (`hint_purchased`, `hints_cost_total`, `signal_type`) removed.
3. **Physical Separation of Agent Metadata (`session_agent_metadata`)**: Universal session attributes (`locale`, `total_trials`, `warmup_trials`, `total_duration_ms`) live on `completed_sessions`, while LLM-only attributes (`model_name`, `persona`, `thinking_effort`, `evaluation_mode`, token counts) live in `session_agent_metadata` (populated only when `subject_type != 'HUMAN'`).
4. **Unified `AssessmentMetrics`**: The legacy split between `summary` and `metacognitive_metrics` (which duplicated `d_star` and persisted constants like `target_staircase_convergence`) is flattened into a single `metrics` structure.
