from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.schemas import EvidenceCreate
from app.models.evidence import Evidence
from app.models.encryption import Encryption
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
    # Step 1: Verify ownership
    evidence = await metadata.get_evidence(db, evidence_id, user_id)

    # Step 2: Get the encryption record for this evidence
    result = await db.execute(
        select(Encryption).where(Encryption.evidence_id == evidence_id)
    )
    enc = result.scalar_one_or_none()
    if not enc:
        raise ValueError("Encryption record not found for this evidence")

    # Step 3: Decrypt the file using the file_path and IV from the encryption record
    decrypted_bytes = await encryption.decrypt_file(
        evidence_id,
        evidence.file_path,
        enc.iv_nonce
    )

    # Step 4: Log the download
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
    evidence = await metadata.get_evidence(db, evidence_id, user_id)

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