"""
Module 1: Staircase Adaptive Engine (staircase.py)
Implements Levitt's 2-up-1-down adaptive staircase algorithm to lock first-order accuracy around 70.71%.
"""

from typing import List, Tuple, Optional


class StaircaseController:
    """
    Levitt's 2-up-1-down Adaptive Staircase Controller.

    Difficulty Parameter Delta:
      Represents discriminability / difference ratio.
      Lower Delta -> harder task (smaller difference between options).
      Higher Delta -> easier task (larger difference between options).

    State machine rules:
      - 2 consecutive correct responses: Increase difficulty (Delta = Delta - step_size)
      - 1 incorrect response: Decrease difficulty (Delta = Delta + step_size)
      - Step size adaptation:
        Initial step S_0 for first 10 trials.
        Halved to S_0 / 2 after 3 reversals.
    """

    def __init__(
        self,
        initial_delta: float = 0.50,
        initial_step_size: float = 0.08,
        min_delta: float = 0.05,
        max_delta: float = 0.85,
        reversals_for_step_reduction: int = 3,
    ):
        self.min_delta = min_delta
        self.max_delta = max_delta
        self.initial_step_size = initial_step_size
        self.current_step_size = initial_step_size
        self.reversals_for_step_reduction = reversals_for_step_reduction

        self.current_delta = max(min_delta, min(max_delta, initial_delta))
        self.consecutive_correct: int = 0
        self.trial_count: int = 0

        # Last direction: -1 (became harder / delta decreased), +1 (became easier / delta increased), 0 (none)
        self.last_direction: int = 0
        self.reversal_count: int = 0
        self.reversal_trials: List[int] = []

        # History tracking
        self.history_deltas: List[float] = [self.current_delta]
        self.history_responses: List[bool] = []

    def update(self, is_correct: bool) -> float:
        """
        Update the staircase state based on the first-order accuracy of the current trial.
        Returns the new delta parameter for the next trial.
        """
        self.trial_count += 1
        self.history_responses.append(is_correct)

        direction = 0  # -1 means harder (decrease delta), +1 means easier (increase delta)

        if is_correct:
            self.consecutive_correct += 1
            if self.consecutive_correct >= 2:
                # 2-up rule: difficulty increases (delta decreases)
                direction = -1
                self.consecutive_correct = 0
        else:
            # 1-down rule: difficulty decreases (delta increases)
            direction = 1
            self.consecutive_correct = 0

        if direction != 0:
            # Check for reversal: direction opposes previous direction
            if self.last_direction != 0 and direction != self.last_direction:
                self.reversal_count += 1
                self.reversal_trials.append(self.trial_count)

            self.last_direction = direction

            # Step size adaptation:
            # After trial 10 and at least reversals_for_step_reduction reversals, step size is halved
            if self.trial_count > 10 and self.reversal_count >= self.reversals_for_step_reduction:
                self.current_step_size = self.initial_step_size / 2.0

            # Update delta
            if direction == -1:
                # Make harder
                self.current_delta = max(self.min_delta, self.current_delta - self.current_step_size)
            else:
                # Make easier
                self.current_delta = min(self.max_delta, self.current_delta + self.current_step_size)

        self.history_deltas.append(self.current_delta)
        return self.current_delta

    def get_current_delta(self) -> float:
        return self.current_delta

    def get_accuracy(self, exclude_warmup: int = 0) -> float:
        """Calculate first-order accuracy, optionally excluding initial warmup trials."""
        responses = self.history_responses[exclude_warmup:]
        if not responses:
            return 0.0
        return sum(responses) / len(responses)

    def get_estimated_threshold(self, last_n_reversals: int = 4) -> float:
        """Estimate perceptual threshold based on recent reversal points."""
        if len(self.reversal_trials) < 2:
            return self.current_delta
        target_trials = self.reversal_trials[-last_n_reversals:]
        recent_deltas = [self.history_deltas[i] for i in target_trials if i < len(self.history_deltas)]
        if not recent_deltas:
            return self.current_delta
        return sum(recent_deltas) / len(recent_deltas)
