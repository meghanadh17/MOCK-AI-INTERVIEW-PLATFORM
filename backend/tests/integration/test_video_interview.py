import pytest
import cv2
import numpy as np
import time
from httpx import AsyncClient
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict:
    """Helper to create a test user and obtain authentication headers."""
    email = f"video_test_{int(time.time())}@example.com"
    await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "password123"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "password123"}
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}", "token": token}


@pytest.mark.asyncio
async def test_video_interview_rest_lifecycle(client: AsyncClient, auth_headers: dict) -> None:
    headers = {"Authorization": auth_headers["Authorization"]}
    
    # 1. Create session (POST /sessions)
    create_resp = await client.post(
        "/api/v1/video-interview/sessions",
        headers=headers,
        json={"webrtc_room_id": "test_room_123", "browser_info": {"browser": "Chrome", "version": "120.0"}}
    )
    assert create_resp.status_code == 201
    create_data = create_resp.json()
    assert "session" in create_data
    assert "ice_servers" in create_data
    
    session = create_data["session"]
    session_id = session["id"]
    assert session["status"] == "created"
    assert session["webrtc_room_id"] == "test_room_123"
    assert len(create_data["ice_servers"]) > 0
    
    # 2. List sessions (GET /sessions)
    list_resp = await client.get("/api/v1/video-interview/sessions", headers=headers)
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert len(list_data) > 0
    assert any(s["id"] == session_id for s in list_data)
    
    # 3. Get session details (GET /sessions/{id})
    detail_resp = await client.get(f"/api/v1/video-interview/sessions/{session_id}", headers=headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == session_id
    
    # 4. Start session (POST /sessions/{id}/start)
    start_resp = await client.post(f"/api/v1/video-interview/sessions/{session_id}/start", headers=headers)
    assert start_resp.status_code == 200
    assert start_resp.json()["status"] == "started"
    
    # 5. Upload frame fallback (POST /sessions/{id}/frame)
    # Generate mock JPEG bytes
    img = np.ones((100, 100, 3), dtype=np.uint8) * 255
    _, encoded = cv2.imencode(".jpg", img)
    frame_bytes = encoded.tobytes()
    
    frame_resp = await client.post(
        f"/api/v1/video-interview/sessions/{session_id}/frame",
        headers=headers,
        content=frame_bytes
    )
    assert frame_resp.status_code == 200
    assert "composite_score" in frame_resp.json()
    
    # 6. End session (POST /sessions/{id}/end)
    end_resp = await client.post(f"/api/v1/video-interview/sessions/{session_id}/end", headers=headers)
    assert end_resp.status_code == 200
    assert end_resp.json()["status"] == "completed"
    
    # 7. Posture report (GET /sessions/{id}/posture-report)
    posture_resp = await client.get(f"/api/v1/video-interview/sessions/{session_id}/posture-report", headers=headers)
    assert posture_resp.status_code == 200
    posture_data = posture_resp.json()
    assert posture_data["session_id"] == session_id
    assert "average_score" in posture_data
    assert len(posture_data["timeline"]) > 0
    
    # 8. Gaze report (GET /sessions/{id}/gaze-report)
    gaze_resp = await client.get(f"/api/v1/video-interview/sessions/{session_id}/gaze-report", headers=headers)
    assert gaze_resp.status_code == 200
    gaze_data = gaze_resp.json()
    assert gaze_data["session_id"] == session_id
    assert "eye_contact_percentage" in gaze_data
    assert len(gaze_data["timeline"]) > 0
    
    # 9. Emotion report (GET /sessions/{id}/emotion-report)
    emotion_resp = await client.get(f"/api/v1/video-interview/sessions/{session_id}/emotion-report", headers=headers)
    assert emotion_resp.status_code == 200
    emotion_data = emotion_resp.json()
    assert emotion_data["session_id"] == session_id
    assert len(emotion_data["timeline"]) > 0
    
    # 10. Speech report (GET /sessions/{id}/speech-report)
    speech_resp = await client.get(f"/api/v1/video-interview/sessions/{session_id}/speech-report", headers=headers)
    assert speech_resp.status_code == 200
    speech_data = speech_resp.json()
    assert speech_data["session_id"] == session_id
    assert "wpm" in speech_data
    
    # 11. Recording S3 URL (GET /sessions/{id}/recording)
    recording_resp = await client.get(f"/api/v1/video-interview/sessions/{session_id}/recording", headers=headers)
    assert recording_resp.status_code == 200
    assert "recording_url" in recording_resp.json()
    
    # 12. Trigger transcript task (POST /sessions/{id}/transcript)
    tr_trigger_resp = await client.post(f"/api/v1/video-interview/sessions/{session_id}/transcript", headers=headers)
    assert tr_trigger_resp.status_code == 200
    assert tr_trigger_resp.json()["status"] == "processing"
    
    # 13. Get transcript segments (GET /sessions/{id}/transcript)
    transcript_resp = await client.get(f"/api/v1/video-interview/sessions/{session_id}/transcript", headers=headers)
    assert transcript_resp.status_code == 200
    tr_data = transcript_resp.json()
    assert tr_data["session_id"] == session_id
    assert len(tr_data["segments"]) > 0
    
    # 14. Export clip (POST /sessions/{id}/clip/{ts})
    clip_resp = await client.post(f"/api/v1/video-interview/sessions/{session_id}/clip/15000", headers=headers)
    assert clip_resp.status_code == 200
    assert clip_resp.json()["session_id"] == session_id
    assert clip_resp.json()["export_status"] == "processing"
    
    # 15. Summary (GET /sessions/{id}/summary)
    summary_resp = await client.get(f"/api/v1/video-interview/sessions/{session_id}/summary", headers=headers)
    assert summary_resp.status_code == 200
    summary_data = summary_resp.json()
    assert summary_data["session_id"] == session_id
    assert "summary" in summary_data
    assert len(summary_data["key_strengths"]) > 0


@pytest.mark.asyncio
async def test_video_interview_websockets(client: AsyncClient, auth_headers: dict) -> None:
    token = auth_headers["token"]
    
    # Create a session first using the async client
    headers = {"Authorization": f"Bearer {token}"}
    create_resp = await client.post(
        "/api/v1/video-interview/sessions",
        headers=headers,
        json={"webrtc_room_id": "ws_test_room"}
    )
    assert create_resp.status_code == 201
    session_id = create_resp.json()["session"]["id"]
    
    sync_client = TestClient(app)
    
    # 16. Test Binary frames WebSocket (/ws/video-interview/{session_id}/frames)
    img = np.ones((100, 100, 3), dtype=np.uint8) * 255
    _, encoded = cv2.imencode(".jpg", img)
    frame_bytes = encoded.tobytes()
    
    with sync_client.websocket_connect(f"/ws/video-interview/{session_id}/frames?token={token}") as ws:
        # Send mock video frame binary bytes
        ws.send_bytes(frame_bytes)
        # Receive JSON metrics feedback
        feedback = ws.receive_json()
        assert "composite_score" in feedback
        assert "posture_feedback" in feedback
        
    # 17. Test Live coaching tips WebSocket (/ws/video-interview/{session_id}/coach)
    with sync_client.websocket_connect(f"/ws/video-interview/{session_id}/coach?token={token}") as ws:
        tip = ws.receive_json()
        assert tip["type"] == "coaching_tip"
        assert "tip" in tip
        
    # 18. Test Interview Q&A WebSocket (/ws/video-interview/{session_id}/questions)
    with sync_client.websocket_connect(f"/ws/video-interview/{session_id}/questions?token={token}") as ws:
        question = ws.receive_json()
        assert question["type"] == "question"
        assert "question" in question
        
        # Send answer back
        ws.send_json({"answer": "I have extensive experience deploying microservices on AWS with Docker."})
        
        # Receive evaluation
        evaluation = ws.receive_json()
        assert evaluation["type"] == "evaluation"
        assert "grade" in evaluation
        assert "feedback" in evaluation
