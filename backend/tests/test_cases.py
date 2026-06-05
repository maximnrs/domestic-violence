import os
from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock

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

from app.controllers import cases as case_controller
from app.services import case as case_service


def make_case(case_id: int = 10, user_id: int = 20):
    return SimpleNamespace(
        case_id=case_id,
        user_id=user_id,
        case_title="My Case",
        description=None,
        creation_date=date(2026, 1, 1),
        status="open",
    )


def make_client(authenticated: bool = True) -> TestClient:
    app = FastAPI()
    app.include_router(case_controller.router)

    async def fake_db():
        yield object()

    app.dependency_overrides[case_controller.get_db] = fake_db

    if authenticated:
        app.dependency_overrides[case_controller.get_current_user] = lambda: SimpleNamespace(
            user_id=20
        )

    return TestClient(app)


def test_get_my_case_returns_404_when_authenticated_user_has_no_case(monkeypatch):
    monkeypatch.setattr(
        case_controller.case_service,
        "get_user_case",
        AsyncMock(side_effect=case_service.CaseNotFoundError("Case not found")),
    )

    response = make_client().get("/cases/me")

    assert response.status_code == 404
    assert response.json() == {"detail": "Case not found"}


def test_get_my_case_returns_authenticated_users_single_case(monkeypatch):
    monkeypatch.setattr(
        case_controller.case_service,
        "get_user_case",
        AsyncMock(return_value=make_case()),
    )

    response = make_client().get("/cases/me")

    assert response.status_code == 200
    assert response.json() == {
        "case_id": 10,
        "user_id": 20,
        "case_title": "My Case",
        "description": None,
        "creation_date": "2026-01-01",
        "status": "open",
    }


def test_create_second_case_returns_conflict(monkeypatch):
    monkeypatch.setattr(
        case_controller.case_service,
        "create_case",
        AsyncMock(side_effect=case_service.DuplicateCaseError("User already has a case")),
    )

    response = make_client().post(
        "/cases/",
        json={"case_title": "Another Case", "description": None, "status": "open"},
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "User already has a case"}


def test_get_my_case_requires_authentication():
    response = make_client(authenticated=False).get("/cases/me")

    assert response.status_code == 401
