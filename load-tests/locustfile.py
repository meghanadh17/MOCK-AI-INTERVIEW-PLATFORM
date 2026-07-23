"""
MockAI Baseline Load Test Script (Locust)
Target: 100 Virtual Concurrent Users running for 60 Seconds
"""

import time
import random
from locust import HttpUser, task, between

class MockAIBaselineUser(HttpUser):
    wait_time = between(0.1, 0.5)

    @task(3)
    def test_root_health(self):
        self.client.get("/", name="GET / (Root Health)")

    @task(4)
    def test_auth_login_validation(self):
        self.client.post(
            "/api/v1/auth/login",
            json={"email": "candidate@mockai.org", "password": "Password123!"},
            name="POST /api/v1/auth/login"
        )

    @task(3)
    def test_job_search_index(self):
        self.client.get(
            "/api/v1/jobs/search?query=developer&location=remote",
            name="GET /api/v1/jobs/search"
        )

    @task(2)
    def test_quiz_catalog(self):
        self.client.get("/api/v1/quiz/list", name="GET /api/v1/quiz/list")

    @task(2)
    def test_interview_questions(self):
        self.client.get("/api/v1/interview/questions?category=system_design", name="GET /api/v1/interview/questions")
