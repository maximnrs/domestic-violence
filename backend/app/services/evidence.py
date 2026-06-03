from sqlalchemy.ext.asyncio import AsyncSession
from app.models.schemas import EvidenceCreate
from app.models.evidence import Evidence
from app.services import encryption, metadata, auditlog
from app.core import timestamp

async def upload_evidence(
    db: AsyncSession,
    user_id: int,
    incident_id: int,
    file_name: str,
    file_bytes: bytes,
    data: EvidenceCreate
) -> Evidence:
    """
    Orchestrate the full evidence upload flow:
    1. Encrypt the file
    2. Store encryption key in OpenBao
    3. Upload encrypted file to MinIO
    4. Get RFC 3161 timestamp
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
    # Step 1: Encrypt the file
    encryption_data = await encryption.encrypt_file(user_id, incident_id, file_bytes)    
    # Step 2: Get a timestamp
    ts_data = await timestamp.request_timestamp()
    
    # Step 3: Save metadata to database
    evidence = await metadata.save_evidence_metadata(
        db,
        user_id,
        incident_id,
        file_name,
        encryption_data,
        data
    )
    
    # Step 4: Write audit log
    await auditlog.log_action(
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
    evidence_id: int
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
    # Step 1: Verify ownership
    evidence = await metadata.get_evidence(db, evidence_id, user_id)
    
    # Step 2: Decrypt the file
    decrypted_bytes = await encryption.decrypt_file(
        evidence_id,
        evidence.file_path,
        evidence.encryption.aes_key_reference,
        evidence.encryption.iv_nonce
    )
    
    # Step 3: Log the download
    await auditlog.log_action(
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
    evidence_id: int
):
    """
    Delete evidence (soft delete or permanent removal).
    """
    evidence = await metadata.get_evidence(db, evidence_id, user_id)
    
    # Log the deletion
    await auditlog.log_action(
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