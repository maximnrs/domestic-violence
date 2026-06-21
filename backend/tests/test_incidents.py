import os
from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost/test")
os.environ.setdefault("MINIO_ENDPOINT", "http://localhost:9000")
os.environ.setdefault("MINIO_ACCESS_KEY", "test")
os.environ.setdefault("MINIO_SECRET_KEY", "test")
os.environ.setdefault("MINIO_BUCKET", "test")
os.environ.setdefault("VAULT_URL", "http://localhost:8200")
os.environ.setdefault("VAULT_TOKEN", "test")
os.environ.setdefault("SECRET_KEY", "test")

from app.controllers import incident as incident_controller
from app.services import incident as incident_service


def make_incident(incident_id: int = 30, case_id: int = 10):
    return SimpleNamespace(
        incident_id=incident_id,
        case_id=case_id,
        incident_date=date(2026, 1, 2),
        incident_time=None,
        location="Amsterdam",
        incident_type="other",
        description="Test incident",
        creation_date=date(2026, 1, 3),
    )


def make_client() -> TestClient:
    app = FastAPI()
    app.include_router(incident_controller.router)

    async def fake_db():
        yield object()

    app.dependency_overrides[incident_controller.get_db] = fake_db
    app.dependency_overrides[incident_controller.get_current_user] = lambda: SimpleNamespace(
        user_id=20
    )

    return TestClient(app)


def test_get_incidents_passes_authenticated_user_and_case_id(monkeypatch):
    get_incidents = AsyncMock(return_value=[make_incident(case_id=10)])
    monkeypatch.setattr(incident_controller.incident_service, "get_incidents", get_incidents)

    response = make_client().get("/incidents/?case_id=10")

    assert response.status_code == 200
    assert response.json() == [
        {
            "incident_id": 30,
            "case_id": 10,
            "incident_date": "2026-01-02",
            "incident_time": None,
            "location": "Amsterdam",
            "incident_type": "other",
            "description": "Test incident",
            "creation_date": "2026-01-03",
        }
    ]
    get_incidents.assert_awaited_once()
    _, user_id, case_id = get_incidents.await_args.args
    assert user_id == 20
    assert case_id == 10


@pytest.mark.anyio
async def test_get_incidents_verifies_case_ownership_with_user_id(monkeypatch):
    verify_case_ownership = AsyncMock()
    monkeypatch.setattr(incident_service, "verify_case_ownership", verify_case_ownership)

    fake_result = SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: []))
    fake_db = SimpleNamespace(execute=AsyncMock(return_value=fake_result))

    incidents = await incident_service.get_incidents(fake_db, user_id=20, case_id=10)

    assert incidents == []
    verify_case_ownership.assert_awaited_once_with(fake_db, 10, 20)
