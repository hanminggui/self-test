"""
Test Suite: REST API (test_api.py)
Tests FastAPI HTTP endpoints for starting session, submitting steps, and getting reports.
"""

import pytest
from fastapi.testclient import TestClient
from metacognitive_testing.api import app

client = TestClient(app)


def test_api_full_flow():
    # 1. Start session
    start_res = client.post(
        "/api/sessions/start",
        json={
            "subject_type": "TEST_HUMAN",
            "total_trials": 4,
            "warmup_trials": 1,
            "initial_delta": 0.5,
        },
    )
    assert start_res.status_code == 200
    data = start_res.json()
    session_id = data["session_id"]
    assert data["trial_index"] == 1
    assert "options" in data["payload"]
    assert "correct_option" not in data["payload"]

    # 2. Get current trial
    trial_res = client.get(f"/api/sessions/{session_id}/trial")
    assert trial_res.status_code == 200
    assert trial_res.json()["session_id"] == session_id

    # 3. Step through trials using unified /step endpoint (Spec 4.2)
    for trial_idx in range(1, 5):
        step_res = client.post(
            "/api/sessions/step",
            json={
                "session_id": session_id,
                "trial_index": trial_idx,
                "phase_1_response": {"selected_option": "A"},
                "phase_2_metacognitive_action": {
                    "action": "SAFE_BET",
                    "confidence_level": 0.60,
                },
            },
        )
        assert step_res.status_code == 200

    # 4. Get final report conforming to Spec 4.3
    rep_res = client.get(f"/api/sessions/{session_id}/report")
    assert rep_res.status_code == 200
    rep = rep_res.json()
    assert rep["session_id"] == session_id
    assert "metacognitive_metrics" in rep
    assert "d_prime" in rep["metacognitive_metrics"]
    assert "meta_d_prime" in rep["metacognitive_metrics"]
    assert "m_ratio" in rep["metacognitive_metrics"]
    assert "diagnostic_profile" in rep
    assert "archetype" in rep["diagnostic_profile"]


def test_api_inpage_hint_then_wagering_flow():
    """
    Tests interaction flow specified by user:
    - User sees task, options A, B, and C (buy hint)
    - If user picks C: in-page hint is fetched via /hint during Phase 1 without navigating away
    - After reading hint, user selects A or B
    - Wagering panel allows finalizing bet / BUY_HINT action
    """
    start_res = client.post(
        "/api/sessions/start",
        json={
            "subject_type": "TEST_HUMAN",
            "total_trials": 2,
            "warmup_trials": 1,
            "initial_delta": 0.5,
        },
    )
    assert start_res.status_code == 200
    session_id = start_res.json()["session_id"]

    # 1. User sees trial payload with has_hint=True and options A, B
    trial_res = client.get(f"/api/sessions/{session_id}/trial")
    assert trial_res.status_code == 200
    payload = trial_res.json()["payload"]
    assert payload["has_hint"] is True
    assert "A" in payload["options"] and "B" in payload["options"]

    # 2. User chooses Option C (Buy hint in-page) BEFORE submitting A or B
    hint_res = client.post(f"/api/sessions/{session_id}/hint")
    assert hint_res.status_code == 200
    hint_data = hint_res.json()
    assert "hint" in hint_data
    assert len(hint_data["hint"]) > 0
    assert hint_data["hint_cost"] == 2

    # 3. User, informed by hint, selects option A
    p1_res = client.post(
        f"/api/sessions/{session_id}/phase1",
        json={"choice": "A"}
    )
    assert p1_res.status_code == 200

    # 4. Wagering phase: user submits BUY_HINT action
    p2_res = client.post(
        f"/api/sessions/{session_id}/phase2",
        json={
            "action": "BUY_HINT",
            "confidence_level": 0.85,
            "revised_choice": "A"
        }
    )
    assert p2_res.status_code == 200
    assert p2_res.json()["status"] == "NEXT_TRIAL_READY"
    assert p2_res.json()["next_trial_index"] == 2


def test_cohort_scatter_endpoint():
    # 1. Complete a genuine test session with a custom subject name
    start_res = client.post(
        "/api/sessions/start",
        json={
            "subject_name": "张三_测试员",
            "subject_type": "TEST_HUMAN",
            "total_trials": 2,
            "warmup_trials": 1,
            "initial_delta": 0.5,
        },
    )
    assert start_res.status_code == 200
    session_id = start_res.json()["session_id"]

    for trial_idx in range(1, 3):
        client.post(
            "/api/sessions/step",
            json={
                "session_id": session_id,
                "trial_index": trial_idx,
                "phase_1_response": {"selected_option": "A"},
                "phase_2_metacognitive_action": {
                    "action": "SAFE_BET",
                    "confidence_level": 0.70,
                },
            },
        )

    # 2. Query cohort scatter endpoint
    res = client.get(f"/api/cohort/scatter?current_session_id={session_id}")
    assert res.status_code == 200
    data = res.json()
    assert "subjects" in data
    assert len(data["subjects"]) >= 1
    assert "baseline_x" in data and "baseline_y" in data
    assert "median_x" in data and "median_y" in data

    # Verify that the genuine subject is found with correct name
    target = next((s for s in data["subjects"] if s["id"] == session_id), None)
    assert target is not None
    assert target["name"] == "张三_测试员"
    assert target["is_current"] is True
    assert "first_order_accuracy" in target
    assert "second_order_accuracy" in target
    assert "d_prime" in target
    assert "m_ratio" in target


def test_admin_endpoints():
    from metacognitive_testing.api import ADMIN_PASSWORD

    # 1. Access admin UI page
    admin_res = client.get("/admin")
    assert admin_res.status_code == 200
    assert "text/html" in admin_res.headers["content-type"]
    assert "管理控制台" in admin_res.text

    # 2. Verify token with wrong password
    verify_bad = client.post("/api/admin/verify", json={"token": "wrong_password"})
    assert verify_bad.status_code == 200
    assert verify_bad.json()["valid"] is False

    # 3. Verify token with correct password
    verify_ok = client.post("/api/admin/verify", json={"token": ADMIN_PASSWORD})
    assert verify_ok.status_code == 200
    assert verify_ok.json()["valid"] is True

    # 4. Access admin sessions list
    sessions_res = client.get("/api/admin/sessions")
    assert sessions_res.status_code == 200
    assert "sessions" in sessions_res.json()
