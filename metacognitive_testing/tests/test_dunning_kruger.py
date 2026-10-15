"""
Test Suite: Dunning-Kruger Effect Discrimination (test_dunning_kruger.py)
Acceptance Criterion 2:
  - Blind Gambler Agent (always bets high): M_ratio < 0.4 and calibration_bias > +0.25.
  - Ideal Agent (bets high when correct, bets safe when incorrect): M_ratio >= 0.95.
"""

import pytest
from metacognitive_testing.session_manager import SessionManager
from metacognitive_testing.agents import MockSubjectAgent
from metacognitive_testing.models import (
    TrialResponse,
    Phase1Response,
    Phase2MetacognitiveAction,
)


def run_agent_simulation(policy: str, total_trials: int = 60, seed: int = 42):
    sm = SessionManager()
    session = sm.create_session(
        subject_type=f"MOCK_{policy}",
        total_trials=total_trials,
        warmup_trials=20,
        seed=seed,
    )

    agent = MockSubjectAgent(
        name=f"Agent_{policy}",
        first_order_accuracy=0.7071,
        policy=policy,
        seed=seed,
    )

    while not session.is_completed:
        req = sm.get_trial_request(session.session_id)
        current_task = session.current_task

        chosen, action, conf, buy_hint, revised = agent.decide_choice_and_action(
            correct_option=current_task.correct_option
        )

        resp = TrialResponse(
            session_id=session.session_id,
            trial_index=req.trial_index,
            phase_1_response=Phase1Response(selected_option=chosen),
            phase_2_metacognitive_action=Phase2MetacognitiveAction(
                action=action,
                confidence_level=conf,
                buy_hint_requested=buy_hint,
                revised_option=revised,
            ),
        )
        sm.process_trial_response(resp)

    report = sm.get_report(session.session_id)
    return report


def test_blind_gambler_agent():
    """
    Acceptance Criterion 2a:
    Blind Gambler Agent: M_ratio < 0.4, calibration_bias > +0.25
    """
    report = run_agent_simulation(policy="blind_gambler", total_trials=80, seed=42)
    metrics = report.metacognitive_metrics

    print("\n--- Blind Gambler Metrics ---")
    print("M_ratio:", metrics.m_ratio)
    print("Calibration Bias:", metrics.calibration_bias)
    print("Archetype:", report.diagnostic_profile.archetype)

    assert metrics.m_ratio < 0.40, f"Expected M_ratio < 0.4, got {metrics.m_ratio}"
    assert metrics.calibration_bias > 0.25, f"Expected calibration_bias > +0.25, got {metrics.calibration_bias}"
    assert report.diagnostic_profile.archetype in [
        "BLIND_GAMBLER",
        "OVERCONFIDENT",
    ]


def test_ideal_metacognitive_agent():
    """
    Acceptance Criterion 2b:
    Ideal Agent: M_ratio >= 0.95
    """
    report = run_agent_simulation(policy="ideal", total_trials=80, seed=42)
    metrics = report.metacognitive_metrics

    print("\n--- Ideal Agent Metrics ---")
    print("M_ratio:", metrics.m_ratio)
    print("Calibration Bias:", metrics.calibration_bias)
    print("Archetype:", report.diagnostic_profile.archetype)

    assert metrics.m_ratio >= 0.95, f"Expected M_ratio >= 0.95, got {metrics.m_ratio}"
    assert report.diagnostic_profile.archetype == "ACCURATELY_CALIBRATED"
