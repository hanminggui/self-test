"""
Test Agents and LLM Subject Client (agents.py)
Provides:
  1. Mock agents for calibration & acceptance testing (Dunning-Kruger, Ideal, etc.)
  2. Generic LLM agent protocol client for running real models against the benchmark.
"""

import random
from typing import Dict, Any, Optional
from metacognitive_testing.models import (
    TrialRequest,
    TrialResponse,
    Phase1Response,
    Phase2MetacognitiveAction,
    MetacognitiveAction,
)


class BaseSubjectAgent:
    """Base interface for all test subjects (Human, Mock, or LLM)."""

    def respond(self, request: TrialRequest) -> TrialResponse:
        raise NotImplementedError


class MockSubjectAgent(BaseSubjectAgent):
    """
    Mock agent with configurable first-order accuracy and metacognitive policy.
    """

    def __init__(
        self,
        name: str = "MockAgent",
        first_order_accuracy: float = 0.7071,
        policy: str = "ideal",  # "ideal", "blind_gambler", "underconfident", "random"
        seed: Optional[int] = None,
    ):
        self.name = name
        self.accuracy = first_order_accuracy
        self.policy = policy
        self.rng = random.Random(seed)

    def decide_choice_and_action(
        self, correct_option: Optional[str] = None
    ) -> tuple[str, MetacognitiveAction, float, bool, Optional[str]]:
        """
        Determines choice and metacognitive action.
        If correct_option is provided (in mock test harness), accuracy is controlled precisely.
        """
        is_correct = self.rng.random() < self.accuracy

        if correct_option:
            if is_correct:
                chosen = correct_option
            else:
                other_opts = [o for o in ["A", "B", "C", "D"] if o != correct_option]
                chosen = other_opts[0]
        else:
            chosen = self.rng.choice(["A", "B", "C", "D"])

        # Decide Phase 2 metacognitive action according to policy
        if self.policy == "blind_gambler":
            # Dunning-Kruger: relentlessly wagers HIGH_BET regardless of correctness
            action = MetacognitiveAction.HIGH_BET
            confidence = 0.99
            buy_hint = False
            revised = None

        elif self.policy == "ideal":
            # Ideal metacognition: High bet when correct, Safe bet when incorrect
            if is_correct:
                action = MetacognitiveAction.HIGH_BET
                confidence = 0.92
            else:
                action = MetacognitiveAction.SAFE_BET
                confidence = 0.52
            buy_hint = False
            revised = None

        elif self.policy == "underconfident":
            # Chronic imposter: almost always picks SAFE_BET despite being correct
            action = MetacognitiveAction.SAFE_BET
            confidence = 0.52
            buy_hint = False
            revised = None

        elif self.policy == "hint_seeker":
            # Strategically buys hint when uncertain
            if is_correct:
                action = MetacognitiveAction.HIGH_BET
                confidence = 0.88
                buy_hint = False
                revised = None
            else:
                action = MetacognitiveAction.BUY_HINT
                confidence = 0.75
                buy_hint = True
                revised = correct_option if correct_option else "A"

        else:
            # Random policy
            action = self.rng.choice(
                [MetacognitiveAction.HIGH_BET, MetacognitiveAction.SAFE_BET]
            )
            confidence = self.rng.uniform(0.5, 0.9)
            buy_hint = False
            revised = None

        return chosen, action, confidence, buy_hint, revised

    def respond(self, request: TrialRequest) -> TrialResponse:
        # In a real environment, the agent doesn't see correct_option
        chosen = self.rng.choice(["A", "B"])
        if self.policy == "blind_gambler":
            action = MetacognitiveAction.HIGH_BET
            confidence = 0.95
        elif self.policy == "underconfident":
            action = MetacognitiveAction.SAFE_BET
            confidence = 0.52
        else:
            action = MetacognitiveAction.HIGH_BET if self.rng.random() < 0.7 else MetacognitiveAction.SAFE_BET
            confidence = 0.85 if action == MetacognitiveAction.HIGH_BET else 0.55

        return TrialResponse(
            session_id=request.session_id,
            trial_index=request.trial_index,
            phase_1_response=Phase1Response(selected_option=chosen),
            phase_2_metacognitive_action=Phase2MetacognitiveAction(
                action=action,
                confidence_level=confidence,
                buy_hint_requested=False,
            ),
        )
