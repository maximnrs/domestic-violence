import asyncio
import os
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost/test")
os.environ.setdefault("MINIO_ENDPOINT", "http://localhost:9000")
os.environ.setdefault("MINIO_ACCESS_KEY", "test")
os.environ.setdefault("MINIO_SECRET_KEY", "test")
os.environ.setdefault("MINIO_BUCKET", "test")
os.environ.setdefault("VAULT_URL", "http://localhost:8200")
os.environ.setdefault("VAULT_TOKEN", "test")
os.environ.setdefault("SECRET_KEY", "test")

from app.controllers import evidence as evidence_controller
from app.controllers import evidencetype as evidencetype_controller
from app.models.schemas import EvidenceCreate
from app.services import encryption as encryption_service
from app.services import evidence as evidence_service
from app.services import metadata as metadata_service


def cryptography_available() -> bool:
    try:
        encryption_service.get_cipher_dependencies()
        return True
    except ImportError:
        return False


class FakeUploadFile:
    def __init__(self, content: bytes = b"test evidence", filename: str = "evidence.txt"):
        self.content = content
        self.filename = filename
        self.read_called = False

    async def read(self):
        self.read_called = True
        return self.content


class InMemoryKeyStore:
    def __init__(self):
        self.keys = {}

    async def store_key(self, user_id, incident_id, file_id, key_bytes):
        key_reference = f"evidence/user_{user_id}/incident_{incident_id}/{file_id}"
        self.keys[key_reference] = key_bytes
        return key_reference

    async def retrieve_key_by_reference(self, key_reference):
        return self.keys[key_reference]


class InMemoryObjectStorage:
    def __init__(self):
        self.files = {}

    async def upload_file(self, file_key, file_bytes):
        self.files[file_key] = file_bytes
        return file_key

    async def download_file(self, file_key):
        return self.files[file_key]


class RecordingAuditLogger:
    def __init__(self):
        self.actions = []

    async def log_action(self, *args, **kwargs):
        self.actions.append((args, kwargs))


def test_evidence_type_lookup_requires_authentication():
    app = FastAPI()
    app.include_router(evidencetype_controller.router)

    async def fake_db():
        yield object()

    app.dependency_overrides[evidencetype_controller.get_db] = fake_db
    response = TestClient(app).get("/evidence-types/")

    assert response.status_code == 401


def test_evidence_type_lookup_returns_persisted_types(monkeypatch):
    app = FastAPI()
    app.include_router(evidencetype_controller.router)

    async def fake_db():
        yield object()

    app.dependency_overrides[evidencetype_controller.get_db] = fake_db
    app.dependency_overrides[evidencetype_controller.get_current_user] = lambda: SimpleNamespace(
        user_id=1
    )
    monkeypatch.setattr(
        evidencetype_controller.evidencetype_service,
        "get_evidence_types",
        AsyncMock(
            return_value=[
                SimpleNamespace(
                    evidence_type_id=1,
                    type_name="written_note",
                    description="Written text note",
                ),
                SimpleNamespace(
                    evidence_type_id=2,
                    type_name="audio",
                    description="Voice or audio recording",
                ),
            ]
        ),
    )

    response = TestClient(app).get("/evidence-types/")

    assert response.status_code == 200
    assert response.json() == [
        {
            "evidence_type_id": 1,
            "type_name": "written_note",
            "description": "Written text note",
        },
        {
            "evidence_type_id": 2,
            "type_name": "audio",
            "description": "Voice or audio recording",
        },
    ]


def test_upload_authorizes_incident_before_reading_file(monkeypatch):
    upload_file = FakeUploadFile()
    upload_mock = AsyncMock(return_value=SimpleNamespace(evidence_id=1))
    monkeypatch.setattr(
        evidence_controller.incident_service,
        "get_incident",
        AsyncMock(side_effect=ValueError("Incident not found")),
    )
    monkeypatch.setattr(evidence_controller.evidence_service, "upload_evidence", upload_mock)

    async def call_upload():
        await evidence_controller.upload_evidence(
            incident_id=99,
            evidence_type_id=1,
            file=upload_file,
            db=object(),
            current_user=SimpleNamespace(user_id=5),
        )

    try:
        asyncio.run(call_upload())
    except HTTPException as error:
        assert error.status_code == 404
        assert error.detail == "Incident not found"
    else:
        raise AssertionError("Expected upload to reject inaccessible incident")

    assert upload_file.read_called is False
    upload_mock.assert_not_called()


def test_user_can_upload_to_authorized_incident(monkeypatch):
    upload_file = FakeUploadFile(content=b"hello", filename="note.txt")
    expected = SimpleNamespace(evidence_id=10)
    upload_mock = AsyncMock(return_value=expected)
    monkeypatch.setattr(
        evidence_controller.incident_service,
        "get_incident",
        AsyncMock(return_value=SimpleNamespace(incident_id=3)),
    )
    monkeypatch.setattr(evidence_controller.evidence_service, "upload_evidence", upload_mock)

    result = asyncio.run(
        evidence_controller.upload_evidence(
            incident_id=3,
            evidence_type_id=1,
            file=upload_file,
            evidence_location=None,
            evidence_imei=None,
            evidence_device=None,
            evidence_activation=None,
            description="Preview",
            db=object(),
            current_user=SimpleNamespace(user_id=5),
        )
    )

    assert result is expected
    assert upload_file.read_called is True
    upload_mock.assert_awaited_once()

def test_get_admin_evidence_returns_all_evidence(monkeypatch):
    app = FastAPI()
    app.include_router(evidence_controller.router)

    async def fake_db():
        yield object()

    app.dependency_overrides[evidence_controller.get_db] = fake_db
    app.dependency_overrides[evidence_controller.get_current_user] = lambda: SimpleNamespace(
        user_id=20
    )

    get_all_evidence_for_admin = AsyncMock(
        return_value=[
            SimpleNamespace(
                evidence_id=40,
                incident_id=30,
                user_id=21,
                evidence_type_id=1,
                file_name="audio.m4a",
                evidence_location=None,
                evidence_imei=None,
                evidence_device=None,
                evidence_activation=None,
                file_path="evidence/user_21/incident_30/audio.bin",
                file_hash="abc123",
                created_at=datetime(2026, 1, 4, 12, 30),
                description=None,
            )
        ]
    )
    monkeypatch.setattr(
        metadata_service,
        "get_all_evidence_for_admin",
        get_all_evidence_for_admin,
    )

    response = TestClient(app).get("/evidence/admin/")

    assert response.status_code == 200
    assert response.json() == [
        {
            "evidence_id": 40,
            "incident_id": 30,
            "user_id": 21,
            "evidence_type_id": 1,
            "file_name": "audio.m4a",
            "evidence_location": None,
            "evidence_imei": None,
            "evidence_device": None,
            "evidence_activation": None,
            "file_path": "evidence/user_21/incident_30/audio.bin",
            "file_hash": "abc123",
            "created_at": "2026-01-04T12:30:00",
            "description": None,
        }
    ]
    get_all_evidence_for_admin.assert_awaited_once()


@pytest.mark.skipif(
    not cryptography_available(),
    reason="cryptography backend is unavailable in this environment",
)
def test_encrypt_decrypt_round_trip_for_utf8_text():
    key_store = InMemoryKeyStore()
    object_storage = InMemoryObjectStorage()

    original = "A written note with UTF-8: veilig".encode("utf-8")
    encryption_data = asyncio.run(
        encryption_service.encrypt_file(
            1,
            2,
            original,
            key_store=key_store,
            object_storage=object_storage,
        )
    )
    decrypted = asyncio.run(
        encryption_service.decrypt_file(
            encryption_data["file_path"],
            encryption_data["key_reference"],
            encryption_data["iv_nonce"],
            key_store=key_store,
            object_storage=object_storage,
        )
    )

    assert decrypted == original


@pytest.mark.skipif(
    not cryptography_available(),
    reason="cryptography backend is unavailable in this environment",
)
def test_encrypt_decrypt_round_trip_for_binary_file():
    key_store = InMemoryKeyStore()
    object_storage = InMemoryObjectStorage()

    original = bytes([0, 1, 2, 3, 127, 128, 255])
    encryption_data = asyncio.run(
        encryption_service.encrypt_file(
            1,
            2,
            original,
            key_store=key_store,
            object_storage=object_storage,
        )
    )
    decrypted = asyncio.run(
        encryption_service.decrypt_file(
            encryption_data["file_path"],
            encryption_data["key_reference"],
            encryption_data["iv_nonce"],
            key_store=key_store,
            object_storage=object_storage,
        )
    )

    assert decrypted == original


def test_download_evidence_rejects_unauthorized_access():
    class RejectingMetadataRepository:
        async def get_evidence(self, db, evidence_id, user_id):
            raise ValueError("Evidence not found or access denied")

        async def get_evidence_encryption(self, db, evidence_id):
            raise AssertionError("Encryption metadata should not be loaded")

    class RecordingEncryptionService:
        def __init__(self):
            self.decrypt_called = False

        async def encrypt_file(self, user_id, incident_id, file_bytes):
            raise NotImplementedError

        async def decrypt_file(self, file_path, key_reference, iv_nonce):
            self.decrypt_called = True
            return b""

    encryption_fake = RecordingEncryptionService()

    async def call_download():
        await evidence_service.download_evidence(
            object(),
            user_id=5,
            evidence_id=10,
            encryption_service=encryption_fake,
            metadata_repository=RejectingMetadataRepository(),
            audit_logger=RecordingAuditLogger(),
        )

    try:
        asyncio.run(call_download())
    except ValueError as error:
        assert str(error) == "Evidence not found or access denied"
    else:
        raise AssertionError("Expected unauthorized download to be rejected")

    assert encryption_fake.decrypt_called is False


def test_download_evidence_returns_decrypted_bytes():
    expected = b"original note"

    class DownloadMetadataRepository:
        async def get_evidence(self, db, evidence_id, user_id):
            return SimpleNamespace(
                evidence_id=10,
                incident_id=3,
                file_path="evidence/user_1/incident_3/file.bin",
                file_name="note.txt",
            )

        async def get_evidence_encryption(self, db, evidence_id):
            return SimpleNamespace(
                aes_key_reference="evidence/user_1/incident_3/file",
                iv_nonce="nonce",
            )

    class DecryptingEncryptionService:
        async def encrypt_file(self, user_id, incident_id, file_bytes):
            raise NotImplementedError

        async def decrypt_file(self, file_path, key_reference, iv_nonce):
            return expected

    audit_logger = RecordingAuditLogger()

    result = asyncio.run(
        evidence_service.download_evidence(
            object(),
            user_id=1,
            evidence_id=10,
            encryption_service=DecryptingEncryptionService(),
            metadata_repository=DownloadMetadataRepository(),
            audit_logger=audit_logger,
        )
    )

    assert result == expected
    assert len(audit_logger.actions) == 1


def test_evidence_create_schema_has_no_file_body_field():
    assert "data" not in EvidenceCreate.model_fields
    assert "file_bytes" not in EvidenceCreate.model_fields
