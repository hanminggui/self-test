"""
Data models and schemas for the Metacognitive Testing System.
Strictly conforms to Spec Section 4 (Data Schemas & API).
"""

from enum import Enum
from typing import Dict, Optional, Any, List
from pydantic import BaseModel, Field


class PhaseType(str, Enum):
    PHASE_1_FIRST_ORDER = "PHASE_1_FIRST_ORDER"
    PHASE_2_METACOGNITIVE = "PHASE_2_METACOGNITIVE"
    COMPLETED = "COMPLETED"


class MetacognitiveAction(str, Enum):
    HIGH_BET = "HIGH_BET"      # 选对 +10，选错 -10
    SAFE_BET = "SAFE_BET"      # 保底 +3
    BUY_HINT = "BUY_HINT"      # 消耗 2 分购买线索并允许修正一次选择


class SubjectType(str, Enum):
    HUMAN = "HUMAN"
    LLM_AGENT = "LLM_AGENT"
    LLM_AGENT_CLAUDE_3_5 = "LLM_AGENT_CLAUDE_3_5"
    LLM_AGENT_GPT_4O = "LLM_AGENT_GPT_4O"
    LLM_AGENT_GEMINI = "LLM_AGENT_GEMINI"
    MOCK_AGENT = "MOCK_AGENT"


class CognitiveArchetype(str, Enum):
    ACCURATELY_CALIBRATED = "ACCURATELY_CALIBRATED"     # 精准自知型
    OVERCONFIDENT = "OVERCONFIDENT"                     # 自负型 / 达克效应显著
    UNDERCONFIDENT = "UNDERCONFIDENT"                   # 谨慎内耗型
    BLIND_GAMBLER = "BLIND_GAMBLER"                     # 盲赌型
    RANDOM_GUESSER = "RANDOM_GUESSER"                   # 随机猜测型


class RiskAttitude(str, Enum):
    HIGH_RISK_SEEKING = "HIGH_RISK_SEEKING"
    MODERATE_RATIONAL = "MODERATE_RATIONAL"
    RISK_AVERTED = "RISK_AVERTED"


# -------------------------------------------------------------
# 4.1 试次输入交互 JSON (Trial Request Schema)
# -------------------------------------------------------------
class TrialPayload(BaseModel):
    stimulus_id: str
    difficulty_level: float
    prompt: str
    options: Dict[str, str] = Field(
        ..., description="Candidate choices, e.g. {'A': '...', 'B': '...'}"
    )
    has_hint: bool = Field(default=True, description="Whether costly hint option C is available")
    hint_cost: int = Field(default=2, description="Score cost to purchase hint")
    task_type: Optional[str] = Field(default=None, description="Type of cognitive task")
    # 额外元信息（视觉点阵/符号特征用于Web渲染，绝无答案信息）
    stimulus_data: Optional[Dict[str, Any]] = Field(
        default=None, description="Safe stimulus rendering metadata without answer info"
    )


class TrialRequest(BaseModel):
    session_id: str
    trial_index: int
    phase: PhaseType
    payload: TrialPayload


# -------------------------------------------------------------
# 4.2 试次作答与下注 JSON (Trial Response Schema)
# -------------------------------------------------------------
class Phase1Response(BaseModel):
    selected_option: str = Field(..., description="Chosen option 'A' or 'B'")
    timestamp_ms: Optional[int] = Field(default=None, description="Epoch time in milliseconds")


class Phase2MetacognitiveAction(BaseModel):
    action: MetacognitiveAction = Field(..., description="HIGH_BET, SAFE_BET, or BUY_HINT")
    wager_stake: Optional[int] = Field(default=10, description="Stake value, e.g. 10 or 3")
    confidence_level: Optional[float] = Field(
        default=None, ge=0.0, le=1.0, description="Subjective confidence level [0.0, 1.0]"
    )
    buy_hint_requested: Optional[bool] = Field(default=False)
    revised_option: Optional[str] = Field(
        default=None, description="Optional revised choice if hint was bought"
    )


class TrialResponse(BaseModel):
    session_id: str
    trial_index: int
    phase_1_response: Phase1Response
    phase_2_metacognitive_action: Phase2MetacognitiveAction


# -------------------------------------------------------------
# 内部试次记录模型 (Internal Trial Record for Scoring)
# -------------------------------------------------------------
class TrialRecord(BaseModel):
    trial_index: int
    difficulty_level: float
    stimulus_id: str
    signal_type: str                   # 'S1' (when correct is A) or 'S2' (when correct is B)
    correct_option: str                # 'A' or 'B'
    first_order_choice: str            # 'A' or 'B'
    is_correct_first_order: bool       # Objective accuracy in Phase 1
    action: MetacognitiveAction        # Phase 2 action
    confidence_level: float            # Subjective confidence [0.5, 1.0]
    hint_purchased: bool               # Whether hint was bought
    revised_choice: Optional[str] = None
    is_correct_final: bool             # Accuracy after potential revision
    score_delta: int                   # Score gained or lost in this trial
    is_warmup: bool                    # Whether this trial belongs to staircase warmup


# -------------------------------------------------------------
# 4.3 评测结果输出模型 (Final Assessment Report Schema)
# -------------------------------------------------------------
class SessionSummary(BaseModel):
    total_trials: int
    first_order_accuracy: float
    target_staircase_convergence: float = 0.7071
    final_score: int = 0
    reversals_count: int = 0


class MetacognitiveMetrics(BaseModel):
    d_prime: float
    meta_d_prime: float
    m_ratio: float
    calibration_bias: float
    brier_score: float
    info_buying_efficiency: float


class DiagnosticProfile(BaseModel):
    archetype: CognitiveArchetype
    risk_attitude: RiskAttitude
    critical_weakness: str
    coachability_index: int = Field(..., ge=0, le=100)
    detailed_feedback: Optional[str] = None
    # 正面受测者画像展示层字段 (Strength-based Role Presentation Layer)
    role_title: str = "人形外挂"
    quadrant_code: str = "Q1_MASTER"
    praise_tagline: str = "这人开了？还是挂身上长了个人？"
    strength_tags: List[str] = Field(default_factory=list)
    empowering_feedback: str = ""
    growth_advice: str = ""
    skills: List[Dict[str, str]] = Field(default_factory=list)


class FinalAssessmentReport(BaseModel):
    session_id: str
    subject_name: Optional[str] = "匿名受测者"
    subject_type: str
    summary: SessionSummary
    metacognitive_metrics: MetacognitiveMetrics
    diagnostic_profile: DiagnosticProfile


# -------------------------------------------------------------
# 群体象限点阵数据模型 (Cohort Quadrant Scatter Schema)
# -------------------------------------------------------------
class SubjectDataPoint(BaseModel):
    id: str
    name: str
    subject_type: str
    first_order_accuracy: float         # x: 一元客观正确率 [0.0, 1.0]
    second_order_accuracy: float        # y: 二元判断准确度 [0.0, 1.0]
    d_prime: float                      # 一元 d'
    meta_d_prime: float                 # 二元 Meta-d'
    m_ratio: float                      # M_ratio
    calibration_bias: float             # 校准偏差
    final_score: int                    # 最终得分
    is_current: bool = False            # 是否为当前受试者
    created_at: Optional[str] = None
    role_title: Optional[str] = None
    quadrant_code: Optional[str] = None


class CohortScatterResponse(BaseModel):
    baseline_x: float = 0.7071
    baseline_y: float = 0.7071
    median_x: float
    median_y: float
    mean_x: float
    mean_y: float
    subjects: List[SubjectDataPoint]
