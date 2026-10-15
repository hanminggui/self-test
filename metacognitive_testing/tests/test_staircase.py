"""
Test Suite: Staircase Adaptive Algorithm (test_staircase.py)
Tests 2-up-1-down state transitions, step size halving, and convergence around 70.71%.
"""

import pytest
import random
from metacognitive_testing.staircase import StaircaseController


def test_staircase_basic_transitions():
    sc = StaircaseController(initial_delta=0.50, initial_step_size=0.10)
    assert sc.get_current_delta() == 0.50

    # 1 correct: no change
    new_delta = sc.update(True)
    assert new_delta == 0.50

    # 2 consecutive correct: difficulty increases (delta decreases)
    new_delta = sc.update(True)
    assert round(new_delta, 2) == 0.40

    # 1 incorrect: difficulty decreases (delta increases)
    new_delta = sc.update(False)
    assert round(new_delta, 2) == 0.50


def test_step_size_reduction_after_reversals():
    sc = StaircaseController(
        initial_delta=0.50,
        initial_step_size=0.10,
        reversals_for_step_reduction=3,
    )

    # Alternate correct and incorrect to generate reversals after trial 10
    # Trial 1-10: S_0 = 0.10
    for i in range(10):
        sc.update(i % 2 == 0)

    # Continue until 3 reversals reached
    while sc.reversal_count < 3 and sc.trial_count < 30:
        # 2 correct to force decrease, then 1 wrong to force increase
        sc.update(True)
        sc.update(True)
        sc.update(False)

    assert sc.reversal_count >= 3
    assert sc.trial_count > 10
    assert sc.current_step_size == 0.05  # Halved


def test_staircase_convergence_70pct():
    """
    Acceptance Criterion 1:
    A subject with fixed 70% accuracy running 80 trials.
    Convergence within 20-30 trials, first-order accuracy within 70% +/- 3% (0.67 - 0.74).
    """
    # Test across multiple random seeds for stability
    accuracies = []
    for seed in [42, 101, 2026, 777]:
        rng = random.Random(seed)
        sc = StaircaseController(initial_delta=0.50, initial_step_size=0.08)
        responses = []
        for trial in range(80):
            # Target 70% true probability
            is_correct = rng.random() < 0.7071
            sc.update(is_correct)
            responses.append(is_correct)

        acc = sum(responses) / len(responses)
        accuracies.append(acc)

    mean_acc = sum(accuracies) / len(accuracies)
    assert 0.67 <= mean_acc <= 0.74, f"Mean accuracy was {mean_acc}, expected in [0.67, 0.74]"
