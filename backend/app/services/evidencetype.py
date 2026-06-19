from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evidencetype import EvidenceType

WRITTEN_NOTE_TYPE_NAME = "written_note"
VOICE_AUDIO_TYPE_NAME = "audio"
VIDEO_AUDIO_TYPE_NAME = "video"

DEFAULT_EVIDENCE_TYPES = (
    (WRITTEN_NOTE_TYPE_NAME, "Written text note"),
    (VOICE_AUDIO_TYPE_NAME, "Voice or audio recording"),
    (VIDEO_AUDIO_TYPE_NAME, "Photo or video recording"),
)


async def get_evidence_types(db: AsyncSession) -> list[EvidenceType]:
    result = await db.execute(select(EvidenceType).order_by(EvidenceType.evidence_type_id))
    evidence_types = result.scalars().all()
    existing_type_names = {evidence_type.type_name for evidence_type in evidence_types}
    missing_defaults = [
        EvidenceType(type_name=type_name, description=description)
        for type_name, description in DEFAULT_EVIDENCE_TYPES
        if type_name not in existing_type_names
    ]

    if not missing_defaults:
        return evidence_types

    db.add_all(missing_defaults)
    await db.commit()

    result = await db.execute(select(EvidenceType).order_by(EvidenceType.evidence_type_id))
    return result.scalars().all()
