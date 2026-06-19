from sqlalchemy.ext.asyncio import AsyncSession
from app.models.schemas import EvidenceCreate
from app.models.evidence import Evidence
from app.services import encryption, metadata, auditlog
from app.services.ports import (
    AuditLogger,
    EncryptionService,
    MetadataRepository,
    TimestampClient,
)
from app.core import timestamp

async def upload_evidence(
    db: AsyncSession,
    user_id: int,
    incident_id: int,
    file_name: str,
    file_bytes: bytes,
    data: EvidenceCreate,
    encryption_service: EncryptionService | None = None,
    metadata_repository: MetadataRepository | None = None,
    audit_logger: AuditLogger | None = None,
    timestamp_client: TimestampClient | None = None,
) -> Evidence:
    encryption_service = encryption_service or encryption
    metadata_repository = metadata_repository or metadata
    audit_logger = audit_logger or auditlog
    timestamp_client = timestamp_client or timestamp

    # Step 1: Get a trusted RFC 3161 timestamp for the original evidence bytes.
    timestamp_data = await timestamp_client.request_timestamp(file_bytes)

    # Step 2: Encrypt the file
    encryption_data = await encryption_service.encrypt_file(user_id, incident_id, file_bytes)

    # Step 2: Get a timestamp
    await timestamp_client.request_timestamp()

    # Step 3: Save metadata to database
    evidence = await metadata_repository.save_evidence_metadata(
        db,
        user_id,
        incident_id,
        file_name,
        encryption_data,
        timestamp_data,
        data
    )

    # Step 4: Write audit log
    await audit_logger.log_action(
        db,
        user_id=user_id,
        case_id=None,
        incident_id=incident_id,
        evidence_id=evidence.evidence_id,
        action_type="upload",
        entity_type="evidence",
        entity_id=evidence.evidence_id,
        description=f"Uploaded {file_name}"
    )

    return evidence

async def download_evidence(
    db: AsyncSession,
    user_id: int,
    evidence_id: int,
    encryption_service: EncryptionService | None = None,
    metadata_repository: MetadataRepository | None = None,
    audit_logger: AuditLogger | None = None,
) -> bytes:
    encryption_service = encryption_service or encryption
    metadata_repository = metadata_repository or metadata
    audit_logger = audit_logger or auditlog

    # Step 1: Verify ownership
    evidence = await metadata_repository.get_evidence(db, evidence_id, user_id)

    # Step 2: Get the encryption record for this evidence
    enc = await metadata_repository.get_evidence_encryption(db, evidence_id)

    # Step 3: Decrypt the file using the file_path and IV from the encryption record
    decrypted_bytes = await encryption_service.decrypt_file(
        evidence.file_path,
        enc.aes_key_reference,
        enc.iv_nonce
    )

    # Step 4: Log the download
    await audit_logger.log_action(
        db,
        user_id=user_id,
        case_id=None,
        incident_id=evidence.incident_id,
        evidence_id=evidence_id,
        action_type="download",
        entity_type="evidence",
        entity_id=evidence_id,
        description=f"Downloaded {evidence.file_name}"
    )

    return decrypted_bytes

async def delete_evidence(
    db: AsyncSession,
    user_id: int,
    evidence_id: int,
    metadata_repository: MetadataRepository | None = None,
    audit_logger: AuditLogger | None = None,
):
    metadata_repository = metadata_repository or metadata
    audit_logger = audit_logger or auditlog

    evidence = await metadata_repository.get_evidence(db, evidence_id, user_id)

    await audit_logger.log_action(
        db,
        user_id=user_id,
        case_id=None,
        incident_id=evidence.incident_id,
        evidence_id=evidence_id,
        action_type="delete",
        entity_type="evidence",
        entity_id=evidence_id,
        description=f"Deleted {evidence.file_name}"
    )
