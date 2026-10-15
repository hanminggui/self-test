"""
Test Suite: Psychometric Metrics (test_metrics.py)
Tests Type-1 d', Type-2 Meta-d' (MLE fitting), M_ratio, Calibration Bias, and Brier Score.
"""

import pytest
from metacognitive_testing.models import TrialRecord, MetacognitiveAction
from metacognitive_testing.metrics import PsychometricScorer


def test_type1_sdt_computation():
    # 20 trials with 16 hits and 4 false alarms
    records = []
    # 10 S2 trials: 8 hits, 2 misses
    for i in range(10):
        records.append(
            TrialRecord(
                trial_index=i + 1,
                difficulty_level=0.5,
                stimulus_id=f"t{i}",
                signal_type="S2",
                correct_option="B",
                first_order_choice="B" if i < 8 else "A",
                is_correct_first_order=(i < 8),
                action=MetacognitiveAction.SAFE_BET,
                confidence_level=0.7,
                hint_purchased=False,
                is_correct_final=(i < 8),
                score_delta=3,
                is_warmup=False,
            )
        )
    # 10 S1 trials: 2 false alarms (chose B), 8 correct rejections (chose A)
    for i in range(10, 20):
        records.append(
            TrialRecord(
                trial_index=i + 1,
                difficulty_level=0.5,
                stimulus_id=f"t{i}",
                signal_type="S1",
                correct_option="A",
                first_order_choice="B" if i < 12 else "A",
                is_correct_first_order=(i >= 12),
                action=MetacognitiveAction.SAFE_BET,
                confidence_level=0.7,
                hint_purchased=False,
                is_correct_final=(i >= 12),
                score_delta=3,
                is_warmup=False,
            )
        )

    d_prime, c = PsychometricScorer.compute_type1_sdt(records)
    # With ~77% hit rate and ~23% FA rate, d' should be positive and around 1.4 - 1.6
    assert 1.0 < d_prime < 2.0
    assert abs(c) < 0.5  # symmetric response bias near 0


def test_calibration_bias_and_brier():
    # High confidence (0.90) on incorrect trials -> severe overconfidence
    records = [
        TrialRecord(
            trial_index=i,
            difficulty_level=0.5,
            stimulus_id=f"t{i}",
            signal_type="S1",
            correct_option="A",
            first_order_choice="B" if i % 2 == 0 else "A",
            is_correct_first_order=(i % 2 != 0),  # 50% accuracy
            action=MetacognitiveAction.HIGH_BET,
            confidence_level=0.90,  # 90% confidence
            hint_purchased=False,
            is_correct_final=(i % 2 != 0),
            score_delta=0,
            is_warmup=False,
        )
        for i in range(20)
    ]

    bias = PsychometricScorer.compute_calibration_bias(records)
    # 0.90 - 0.50 = +0.40
    assert bias == pytest.approx(0.40, abs=0.01)

    brier = PsychometricScorer.compute_brier_score(records)
    # 0.5*(0.9-1)^2 + 0.5*(0.9-0)^2 = 0.5*0.01 + 0.5*0.81 = 0.41
    assert brier == pytest.approx(0.41, abs=0.02)
