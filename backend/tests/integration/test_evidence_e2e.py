import asyncio
import os
from uuid import uuid4

import boto3
import hvac
import pytest
from botocore.exceptions import ClientError
from fastapi.testclient import TestClient
from sqlalchemy import text

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_INTEGRATION_TESTS") != "1",
    reason="Set RUN_INTEGRATION_TESTS=1 and start docker-compose.integration.yml services",
)

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://test:test@localhost:5433/domestic_violence_test",
)
os.environ.setdefault("MINIO_ENDPOINT", "http://localhost:9000")
os.environ.setdefault("MINIO_ACCESS_KEY", "test-access-key")
os.environ.setdefault("MINIO_SECRET_KEY", "test-secret-key")
os.environ.setdefault("MINIO_BUCKET", "evidence-test")
os.environ.setdefault("VAULT_URL", "http://localhost:8200")
os.environ.setdefault("VAULT_TOKEN", "test-token")
os.environ.setdefault("SECRET_KEY", "integration-test-secret")

from app.core.database import Base, engine
from app.main import app
from app.models import auditlog, case, encryption, evidence, evidencetype, incident, user


@pytest.fixture(scope="session", autouse=True)
def prepare_external_services():
    s3_client = boto3.client(
        "s3",
        endpoint_url=os.environ["MINIO_ENDPOINT"],
        aws_access_key_id=os.environ["MINIO_ACCESS_KEY"],
        aws_secret_access_key=os.environ["MINIO_SECRET_KEY"],
        region_name="us-east-1",
    )
    try:
        s3_client.create_bucket(Bucket=os.environ["MINIO_BUCKET"])
    except ClientError as error:
        if error.response["Error"]["Code"] not in {"BucketAlreadyOwnedByYou", "BucketAlreadyExists"}:
            raise

    vault_client = hvac.Client(
        url=os.environ["VAULT_URL"],
        token=os.environ["VAULT_TOKEN"],
    )
    if "Domestic/" not in vault_client.sys.list_mounted_secrets_engines()["data"]:
        vault_client.sys.enable_secrets_engine(
            backend_type="kv",
            path="Domestic",
            options={"version": "2"},
        )


@pytest.fixture(autouse=True)
def reset_database():
    async def reset_schema():
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all)
            await connection.run_sync(Base.metadata.create_all)
            await connection.execute(
                text(
                    """
                    INSERT INTO evidencetype (evidence_type_id, type_name, description)
                    VALUES
                      (1, 'written_note', 'Written text note'),
                      (2, 'voice_audio', 'Voice or audio recording')
                    """
                )
            )

    async def drop_schema():
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all)

    asyncio.run(reset_schema())
    yield
    asyncio.run(drop_schema())


def test_authenticated_user_can_upload_and_download_evidence_end_to_end():
    client = TestClient(app)
    email = f"client-demo-{uuid4().hex}@example.com"
    password = "correct-horse-battery-staple"

    register_response = client.post(
        "/auth/register",
        json={
            "first_name": "Client",
            "last_name": "Demo",
            "email": email,
            "password": password,
        },
    )
    assert register_response.status_code == 200

    login_response = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    case_response = client.get("/cases/me", headers=headers)
    assert case_response.status_code == 200
    case_id = case_response.json()["case_id"]

    incident_response = client.post(
        "/incidents/",
        headers=headers,
        json={
            "case_id": case_id,
            "incident_date": "2026-06-08",
            "incident_time": "12:30:00",
            "location": "Integration test location",
            "incident_type": "other",
            "description": "E2E test incident",
        },
    )
    assert incident_response.status_code == 200
    incident_id = incident_response.json()["incident_id"]

    original_file = b"e2e evidence bytes"
    upload_response = client.post(
        "/evidence/",
        headers=headers,
        data={
            "incident_id": str(incident_id),
            "evidence_type_id": "1",
            "description": "E2E evidence upload",
        },
        files={"file": ("note.txt", original_file, "text/plain")},
    )
    assert upload_response.status_code == 200
    evidence_payload = upload_response.json()
    assert evidence_payload["file_name"] == "note.txt"
    assert evidence_payload["file_hash"]
    evidence_id = evidence_payload["evidence_id"]

    download_response = client.get(f"/evidence/{evidence_id}/download", headers=headers)
    assert download_response.status_code == 200
    assert bytes.fromhex(download_response.json()["data"]) == original_file
