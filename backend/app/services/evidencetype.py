from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evidencetype import EvidenceType

WRITTEN_NOTE_TYPE_NAME = "written_note"
VOICE_AUDIO_TYPE_NAME = "voice_audio"


async def get_evidence_types(db: AsyncSession) -> list[EvidenceType]:
    result = await db.execute(select(EvidenceType).order_by(EvidenceType.evidence_type_id))
    return result.scalars().all()
