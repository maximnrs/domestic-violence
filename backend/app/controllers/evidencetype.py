from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.schemas import EvidenceTypeResponse
from app.models.user import User
from app.services import evidencetype as evidencetype_service
from app.services.auth import get_current_user

router = APIRouter(prefix="/evidence-types", tags=["Evidence Types"])


@router.get("/", response_model=list[EvidenceTypeResponse])
async def get_evidence_types(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await evidencetype_service.get_evidence_types(db)
