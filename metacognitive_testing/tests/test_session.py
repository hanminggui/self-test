"""
Test Suite: Session Protocol and Anti-Cheat / Leakage Verification (test_session.py)
Acceptance Criterion 3:
  - Network responses and trial payloads strictly forbid leaking correct answers,
    signal types, or correctness metadata in Phase 1 and Phase 2.
"""

import pytest
import json
from metacognitive_testing.session_manager import SessionManager
from metacognitive_testing.models import MetacognitiveAction, PhaseType


def test_zero_leakage_in_trial_payload():
    """Verify that TrialRequest does not contain any answer leakage."""
    sm = SessionManager()
    session = sm.create_session(total_trials=10, warmup_trials=2)

    trial_req = sm.get_trial_request(session.session_id)
    serialized = json.dumps(trial_req.model_dump())

    # Strictly forbidden metadata keys in client payload
    forbidden_keys = [
        "correct_option",
        "signal_type",
        "is_correct",
        "is_correct_first_order",
        "is_correct_final",
        "ground_truth",
        "answer",
    ]
    for key in forbidden_keys:
        assert key not in serialized, f"Leakage detected! Key '{key}' found in TrialRequest"


def test_phase1_does_not_reveal_correctness():
    """Submitting Phase 1 must not reveal whether choice was correct."""
    sm = SessionManager()
    session = sm.create_session(total_trials=10, warmup_trials=2)

    res = sm.submit_phase_1(session.session_id, "A")
    serialized = json.dumps(res)

    forbidden_words = ["is_correct", "correct", "wrong", "false", "score_delta"]
    for word in forbidden_words:
        assert word not in serialized.lower(), f"Leakage detected! Word '{word}' found in Phase 1 reply"

    assert session.current_phase == PhaseType.PHASE_2_METACOGNITIVE


def test_wagering_payoffs():
    sm = SessionManager()
    session = sm.create_session(total_trials=10, warmup_trials=2)

    # Force correct option to A for testing
    session.current_task.correct_option = "A"

    # Trial 1: Choose A, HIGH_BET -> +10
    sm.submit_phase_1(session.session_id, "A")
    res = sm.submit_phase_2(session.session_id, MetacognitiveAction.HIGH_BET)
    assert session.score == 10

    # Trial 2: Force correct option to B, choose A, HIGH_BET -> -10 (Total 0)
    session.current_task.correct_option = "B"
    sm.submit_phase_1(session.session_id, "A")
    res = sm.submit_phase_2(session.session_id, MetacognitiveAction.HIGH_BET)
    assert session.score == 0

    # Trial 3: Choose A, SAFE_BET -> +3 regardless of correctness
    session.current_task.correct_option = "B"
    sm.submit_phase_1(session.session_id, "A")
    res = sm.submit_phase_2(session.session_id, MetacognitiveAction.SAFE_BET)
    assert session.score == 3


def test_inpage_hint_and_buy_hint_payoff():
    sm = SessionManager()
    session = sm.create_session(total_trials=10, warmup_trials=2)

    # Force correct option to A
    session.current_task.correct_option = "A"

    # 1. Purchase hint during Phase 1 (option C selected in-page)
    hint_res = sm.request_hint(session.session_id)
    assert "hint" in hint_res
    assert session.hint_revealed_for_current_trial is True

    # 2. Submit Phase 1 choice
    sm.submit_phase_1(session.session_id, "A")

    # 3. Submit Phase 2 as BUY_HINT -> -2 + 6 = +4
    sm.submit_phase_2(session.session_id, MetacognitiveAction.BUY_HINT)
    assert session.score == 4

    # Next trial: Force correct option to B, purchase hint, choose A (incorrect) -> -2 + 0 = -2
    session.current_task.correct_option = "B"
    sm.request_hint(session.session_id)
    sm.submit_phase_1(session.session_id, "A")
    res = sm.submit_phase_2(session.session_id, MetacognitiveAction.BUY_HINT)
    assert session.score == 2  # 4 - 2 = 2
    assert res["current_score"] == 2
    assert res["score_delta"] == -2


def test_phase2_debug_info_content():
    """Verify that debug_info contains comprehensive staircase and trial metadata."""
    sm = SessionManager()
    session = sm.create_session(total_trials=10, warmup_trials=2)
    session.current_task.correct_option = "C"

    sm.submit_phase_1(session.session_id, "C")
    res = sm.submit_phase_2(session.session_id, MetacognitiveAction.HIGH_BET)

    assert "debug_info" in res
    dbg = res["debug_info"]
    assert dbg["trial_index"] == 1
    assert dbg["first_order_choice"] == "C"
    assert dbg["correct_option"] == "C"
    assert dbg["is_correct"] is True
    assert dbg["action"] == MetacognitiveAction.HIGH_BET
    assert dbg["score_delta"] == 10
    assert dbg["current_total_score"] == 10
    assert "previous_delta" in dbg
    assert "new_delta" in dbg
    assert "staircase_reversals" in dbg
    assert "staircase_consecutive_correct" in dbg
    assert "staircase_step_size" in dbg


