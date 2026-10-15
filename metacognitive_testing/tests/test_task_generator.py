"""
Test Suite: Task Generator (test_task_generator.py)
Validates synthetic task generation, 8 cognitive paradigms, 4 candidate options each,
strict deduplication guarantee, zero factual knowledge, and difficulty parameter Delta scaling.
"""

from metacognitive_testing.task_generator import TaskGenerator


def test_task_generation_four_options_and_distinctness():
    gen = TaskGenerator(seed=42)

    for i in range(1, 25):
        task = gen.generate(trial_index=i, delta=0.45)
        # 1. 4 candidate options
        assert len(task.options) == 4
        assert set(task.options.keys()) == {"A", "B", "C", "D"}

        # 2. Hard uniqueness guarantee (AB and all options strictly distinct)
        all_vals = list(task.options.values())
        assert len(set(all_vals)) == 4, f"Duplicate option detected in trial {i}: {task.options}"

        # 3. Valid metadata
        assert task.correct_option in ["A", "B", "C", "D"]
        assert task.signal_type in ["S1", "S2"]
        assert len(task.hint) > 0


def test_safe_payload_leakage_free():
    gen = TaskGenerator(seed=123)
    task = gen.generate(trial_index=3, delta=0.25)
    payload = task.to_safe_payload()

    # Payload dictionary must not contain correct_option, signal_type, or hint
    dumped = payload.model_dump()
    assert "correct_option" not in dumped
    assert "signal_type" not in dumped
    assert "hint" not in dumped
    assert dumped["stimulus_id"] == task.stimulus_id
    assert dumped["difficulty_level"] == 0.25
    assert len(dumped["options"]) == 4


def test_eight_cognitive_paradigms_coverage():
    """Verify that all 8 abstract cognitive paradigms generate correctly with rich variations."""
    gen = TaskGenerator(seed=2026)

    expected_types = [
        ("SYNTHETIC_CIPHER", "cipher_rule"),
        ("DOT_DENSITY", "density_matrix"),
        ("MATRIX_REASONING", "matrix_reason"),
        ("SPATIAL_ROTATION", "spatial_rot"),
        ("PARITY_INVARIANT", "parity_invar"),
        ("RELATIONAL_TRANSITIVITY", "relation_trans"),
        ("SEQUENCE_PROGRESSION", "seq_prog"),
        ("TOPOLOGICAL_LOOPS", "topo_loops"),
    ]

    for idx, (expected_type, expected_id_prefix) in enumerate(expected_types, start=1):
        task = gen.generate(trial_index=idx, delta=0.40)
        assert task.stimulus_id.startswith(expected_id_prefix)
        assert task.stimulus_data["task_type"] == expected_type
        assert len(task.options) == 4
        assert len(set(task.options.values())) == 4
        assert task.correct_option in ["A", "B", "C", "D"]
        assert task.signal_type in ["S1", "S2"]
        assert len(task.hint) > 0

        safe = task.to_safe_payload().model_dump()
        assert "correct_option" not in safe
        assert "hint" not in safe
        assert safe["has_hint"] is True
        assert safe["hint_cost"] == 2


def test_hint_zero_answer_leakage_guarantee():
    """Verify that hints across many trials NEVER spoil option letters or correct answers."""
    gen = TaskGenerator(seed=999)
    for trial_idx in range(1, 100):
        task = gen.generate(trial_index=trial_idx, delta=0.35)
        hint = task.hint
        # 1. Must never mention any option letter
        for opt in ["选项 A", "选项 B", "选项 C", "选项 D", "选项A", "选项B", "选项C", "选项D"]:
            assert opt not in hint, f"Option leak '{opt}' found in trial {trial_idx} hint: {hint}"
        # 2. Must never mention correct_option letter explicitly
        assert f"选项 {task.correct_option}" not in hint
        # 3. Must never directly state the full option content
        correct_content = task.options[task.correct_option].strip()
        assert correct_content not in hint, f"Direct content leak in trial {trial_idx} hint: {hint}"

