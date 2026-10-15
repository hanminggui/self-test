"""
REST API Service for Metacognitive Testing System (api.py)
Provides endpoints for session lifecycle, two-phase interaction, hint purchasing,
unified response stepping, and psychometric report retrieval.
Also serves static HTML/JS Web UI for human subject testing.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import os
import secrets

from metacognitive_testing.models import (
    TrialRequest,
    TrialResponse,
    FinalAssessmentReport,
    CohortScatterResponse,
    MetacognitiveAction,
    SubjectType,
)
from metacognitive_testing.session_manager import SessionManager

from contextlib import asynccontextmanager

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD") or secrets.token_hex(4)


def print_admin_info(host: str = "127.0.0.1", port: int = 8000):
    admin_link = f"http://{host}:{port}/admin?token={ADMIN_PASSWORD}"
    banner = f"""
========================================================================
  🧠 二元认知评测系统 (Metacognitive Testing System) 服务已启动
  🌐 正常受测者答题页面: http://{host}:{port}/
  🔑 管理控制台免密链接: {admin_link}
  🔒 管理员访问密码:   {ADMIN_PASSWORD}
========================================================================
"""
    print(banner)


@asynccontextmanager
async def lifespan(app: FastAPI):
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    print_admin_info(host, port)
    yield


app = FastAPI(
    title="Metacognitive Testing System API",
    description="Engine for decoupling first-order ability and measuring Type-2 Meta-d' metrics.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

session_manager = SessionManager()

WEB_DIR = os.path.join(os.path.dirname(__file__), "web")


# Request schemas for REST endpoints
class StartSessionRequest(BaseModel):
    session_id: Optional[str] = None
    subject_name: Optional[str] = None
    subject_type: str = SubjectType.HUMAN
    total_trials: int = 30
    warmup_trials: int = 10
    initial_delta: float = 0.50
    seed: Optional[int] = None


class Phase1SubmitRequest(BaseModel):
    choice: str = Field(..., description="'A', 'B', 'C', or 'D'")


class Phase2SubmitRequest(BaseModel):
    action: MetacognitiveAction
    confidence_level: Optional[float] = None
    revised_choice: Optional[str] = None


@app.post("/api/sessions/start", response_model=TrialRequest)
def start_session(req: StartSessionRequest):
    """Starts a new test session and returns the first trial request."""
    session = session_manager.create_session(
        session_id=req.session_id,
        subject_name=req.subject_name,
        subject_type=req.subject_type,
        total_trials=req.total_trials,
        warmup_trials=req.warmup_trials,
        initial_delta=req.initial_delta,
        seed=req.seed,
    )
    return session_manager.get_trial_request(session.session_id)


@app.get("/api/sessions/{session_id}/trial", response_model=TrialRequest)
def get_current_trial(session_id: str):
    """Retrieves current trial stimulus (zero answer metadata)."""
    try:
        return session_manager.get_trial_request(session_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/sessions/{session_id}/phase1")
def submit_phase_1(session_id: str, req: Phase1SubmitRequest):
    """Submits first-order choice ('A' or 'B') without revealing accuracy."""
    try:
        return session_manager.submit_phase_1(session_id, req.choice)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/sessions/{session_id}/hint")
def request_hint(session_id: str):
    """Purchases hint for active trial, costing 2 points."""
    try:
        return session_manager.request_hint(session_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/sessions/{session_id}/phase2")
def submit_phase_2(session_id: str, req: Phase2SubmitRequest):
    """Submits second-order action (HIGH_BET, SAFE_BET, BUY_HINT)."""
    try:
        return session_manager.submit_phase_2(
            session_id=session_id,
            action=req.action,
            confidence_level=req.confidence_level,
            revised_choice=req.revised_choice,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/sessions/step")
def process_step(response: TrialResponse):
    """
    Unified submission of Phase 1 and Phase 2 conforming strictly to Spec 4.2.
    """
    try:
        return session_manager.process_trial_response(response)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/sessions/{session_id}/report", response_model=FinalAssessmentReport)
def get_report(session_id: str):
    """Retrieves final psychometric evaluation report conforming to Spec 4.3."""
    try:
        return session_manager.get_report(session_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/cohort/scatter", response_model=CohortScatterResponse)
def get_cohort_scatter(current_session_id: Optional[str] = None):
    """
    Retrieves multi-subject 4-quadrant first-order vs second-order scatter dataset.
    """
    return session_manager.get_cohort_scatter_data(current_session_id=current_session_id)


# Web UI static route
@app.get("/")
def serve_index():
    index_path = os.path.join(WEB_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Metacognitive Testing System API is online."}


class AdminVerifyRequest(BaseModel):
    token: str


@app.post("/api/admin/verify")
def verify_admin_token(req: AdminVerifyRequest):
    """Verifies administrator access token."""
    return {"valid": req.token == ADMIN_PASSWORD}


@app.get("/admin")
def serve_admin():
    """Serves independent administrator console UI."""
    admin_path = os.path.join(WEB_DIR, "admin.html")
    if os.path.exists(admin_path):
        return FileResponse(admin_path)
    raise HTTPException(status_code=404, detail="Admin page not found.")


@app.get("/api/admin/sessions")
def get_admin_sessions():
    """Retrieves all session data records for admin table."""
    data = session_manager.get_cohort_scatter_data()
    return {"sessions": [s.model_dump() for s in data.subjects]}


if os.path.exists(WEB_DIR):
    app.mount("/static", StaticFiles(directory=WEB_DIR), name="static")
