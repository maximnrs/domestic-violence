from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.evidence import Evidence
from app.models.encryption import Encryption
from app.models.schemas import EvidenceCreate
from datetime import datetime

async def save_evidence_metadata(
    db: AsyncSession,
    user_id: int,
    incident_id: int,
    file_name: str,
    encryption_data: dict,
    data: EvidenceCreate
) -> Evidence:
    """
    Save evidence metadata to PostgreSQL.
    
    Args:
        db: Database session
        user_id: The user who uploaded the evidence
        incident_id: The incident this evidence belongs to
        file_name: Original filename
        encryption_data: Dict with file_path, key_reference, iv_nonce, hmac_hash
        data: The EvidenceCreate schema with additional metadata
    
    Returns:
        The created Evidence record
    """
    # Create evidence record
    evidence = Evidence(
        incident_id=incident_id,
        user_id=user_id,
        evidence_type_id=data.evidence_type_id,
        file_name=file_name,
        evidence_location=data.evidence_location,
        evidence_imei=data.evidence_imei,
        evidence_device=data.evidence_device,
        evidence_activation=data.evidence_activation,
        file_path=encryption_data["file_path"],
        file_hash=encryption_data["hmac_hash"],
        description=data.description
    )
    db.add(evidence)
    await db.flush()  # Get the evidence_id
    
    # Create encryption record
    encryption = Encryption(
        evidence_id=evidence.evidence_id,
        aes_key_reference=encryption_data["key_reference"],
        iv_nonce=encryption_data["iv_nonce"],
        hmac_hash=encryption_data["hmac_hash"],
        integrity_status="pending"
    )
    db.add(encryption)
    await db.commit()
    await db.refresh(evidence)
    
    return evidence

async def get_evidence(db: AsyncSession, evidence_id: int, user_id: int) -> Evidence:
    """
    Get evidence by ID, ensuring user ownership.
    """
    result = await db.execute(
        select(Evidence).where(
            Evidence.evidence_id == evidence_id,
            Evidence.user_id == user_id
        )
    )
    evidence = result.scalar_one_or_none()
    if not evidence:
        raise ValueError("Evidence not found or access denied")
    return evidence

async def get_evidence_encryption(db: AsyncSession, evidence_id: int) -> Encryption:
    """
    Get encryption metadata for an evidence record.
    """
    result = await db.execute(
        select(Encryption).where(Encryption.evidence_id == evidence_id)
    )
    encryption = result.scalar_one_or_none()
    if not encryption:
        raise ValueError("Evidence encryption metadata not found")
    return encryption

async def get_incident_evidence(db: AsyncSession, incident_id: int, user_id: int) -> list[Evidence]:
    """
    Get all evidence for an incident, ensuring user ownership.
    """
    result = await db.execute(
        select(Evidence).where(
            Evidence.incident_id == incident_id,
            Evidence.user_id == user_id
        )
    )
    return result.scalars().all()

async def get_incident_evidence_for_admin(db: AsyncSession, incident_id: int) -> list[Evidence]:
    result = await db.execute(
        select(Evidence).where(Evidence.incident_id == incident_id)
    )
    return result.scalars().all()
