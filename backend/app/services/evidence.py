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
    """
    Orchestrate the full evidence upload flow:
    1. Get RFC 3161 timestamp for the original evidence bytes
    2. Encrypt the file
    3. Store encryption key in OpenBao
    4. Upload encrypted file to MinIO
    5. Save metadata to PostgreSQL
    6. Write audit log
    
    Args:
        db: Database session
        user_id: The user uploading
        incident_id: The incident this belongs to
        file_name: Original filename
        file_bytes: The raw file bytes
        data: EvidenceCreate schema with metadata
    
    Returns:
        The created Evidence record
    """
    encryption_service = encryption_service or encryption
    metadata_repository = metadata_repository or metadata
    audit_logger = audit_logger or auditlog
    timestamp_client = timestamp_client or timestamp

    # Step 1: Get a trusted RFC 3161 timestamp for the original evidence bytes.
    timestamp_data = await timestamp_client.request_timestamp(file_bytes)

    # Step 2: Encrypt the file
    encryption_data = await encryption_service.encrypt_file(user_id, incident_id, file_bytes)
    
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
    """
    Orchestrate evidence download:
    1. Verify user owns the evidence
    2. Retrieve encrypted file from MinIO
    3. Retrieve key from OpenBao
    4. Decrypt
    5. Log the download
    
    Args:
        db: Database session
        user_id: The user downloading
        evidence_id: The evidence to download
    
    Returns:
        The decrypted file bytes
    """
    encryption_service = encryption_service or encryption
    metadata_repository = metadata_repository or metadata
    audit_logger = audit_logger or auditlog

    # Step 1: Verify ownership
    evidence = await metadata_repository.get_evidence(db, evidence_id, user_id)
    
    # Step 2: Get encryption metadata and decrypt the file
    encryption_metadata = await metadata_repository.get_evidence_encryption(db, evidence_id)
    decrypted_bytes = await encryption_service.decrypt_file(
        evidence.file_path,
        encryption_metadata.aes_key_reference,
        encryption_metadata.iv_nonce
    )
    
    # Step 3: Log the download
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
    """
    Delete evidence (soft delete or permanent removal).
    """
    metadata_repository = metadata_repository or metadata
    audit_logger = audit_logger or auditlog

    evidence = await metadata_repository.get_evidence(db, evidence_id, user_id)
    
    # Log the deletion
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
