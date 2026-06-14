from __future__ import annotations

from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.models.evidence import Evidence
    from app.models.encryption import Encryption
    from app.models.schemas import EvidenceCreate


class KeyStore(Protocol):
    async def store_key(
        self,
        user_id: int,
        incident_id: int,
        file_id: str,
        key_bytes: bytes,
    ) -> str:
        ...

    async def retrieve_key_by_reference(self, key_reference: str) -> bytes:
        ...


class ObjectStorage(Protocol):
    async def upload_file(self, file_key: str, file_bytes: bytes) -> str:
        ...

    async def download_file(self, file_key: str) -> bytes:
        ...


class EncryptionService(Protocol):
    async def encrypt_file(
        self,
        user_id: int,
        incident_id: int,
        file_bytes: bytes,
    ) -> dict:
        ...

    async def decrypt_file(
        self,
        file_path: str,
        key_reference: str,
        iv_nonce: str,
    ) -> bytes:
        ...


class TimestampClient(Protocol):
    async def request_timestamp(self, file_bytes: bytes) -> dict:
        ...


class MetadataRepository(Protocol):
    async def save_evidence_metadata(
        self,
        db: AsyncSession,
        user_id: int,
        incident_id: int,
        file_name: str,
        encryption_data: dict,
        timestamp_data: dict,
        data: EvidenceCreate,
    ) -> Evidence:
        ...

    async def get_evidence(
        self,
        db: AsyncSession,
        evidence_id: int,
        user_id: int,
    ) -> Evidence:
        ...

    async def get_evidence_encryption(
        self,
        db: AsyncSession,
        evidence_id: int,
    ) -> Encryption:
        ...


class AuditLogger(Protocol):
    async def log_action(
        self,
        db: AsyncSession,
        user_id: int,
        case_id: int | None,
        incident_id: int | None,
        evidence_id: int | None,
        action_type: str,
        entity_type: str,
        entity_id: int,
        description: str | None = None,
    ):
        ...


class TranscriptionService(Protocol):
    async def transcribe_audio(self, file_bytes: bytes, file_name: str) -> str:
        ...


class ReportGenerator(Protocol):
    async def create_evidence_package(
        self,
        db: AsyncSession,
        user_id: int,
        evidence_id: int,
    ) -> bytes:
        ...
