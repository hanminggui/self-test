"""
Metacognitive Testing System.
Decoupled First-Order Ability & Type-2 Meta-d' Engine.
"""

from metacognitive_testing.models import (
    TrialRequest,
    TrialResponse,
    FinalAssessmentReport,
    MetacognitiveAction,
    PhaseType,
    SubjectType,
    CognitiveArchetype,
)
from metacognitive_testing.staircase import StaircaseController
from metacognitive_testing.task_generator import TaskGenerator
from metacognitive_testing.session_manager import SessionManager
from metacognitive_testing.metrics import PsychometricScorer
from metacognitive_testing.report_generator import ReportGenerator

__version__ = "1.0.0"

__all__ = [
    "TrialRequest",
    "TrialResponse",
    "FinalAssessmentReport",
    "MetacognitiveAction",
    "PhaseType",
    "SubjectType",
    "CognitiveArchetype",
    "StaircaseController",
    "TaskGenerator",
    "SessionManager",
    "PsychometricScorer",
    "ReportGenerator",
]
