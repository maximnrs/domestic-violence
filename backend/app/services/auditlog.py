from sqlalchemy.ext.asyncio import AsyncSession
from app.models.auditlog import AuditLog
from datetime import datetime

async def log_action(
    db: AsyncSession,
    user_id: int,
    case_id: int | None,
    incident_id: int | None,
    evidence_id: int | None,
    action_type: str,
    entity_type: str,
    entity_id: int,
    description: str | None = None
):
    """
    Write to append-only audit log.
    
    Args:
        db: Database session
        user_id: Who performed the action
        case_id: Which case (if applicable)
        incident_id: Which incident (if applicable)
        evidence_id: Which evidence (if applicable)
        action_type: 'upload', 'download', 'delete', etc.
        entity_type: 'evidence', 'case', 'incident', etc.
        entity_id: The ID of the entity
        description: Optional description
    """
    audit_entry = AuditLog(
        user_id=user_id,
        case_id=case_id,
        incident_id=incident_id,
        evidence_id=evidence_id,
        action_type=action_type,
        entity_type=entity_type,
        entity_id=entity_id,
        action_timestamp=datetime.utcnow(),
        old_value=None,
        new_value=description
    )
    db.add(audit_entry)
    await db.commit()