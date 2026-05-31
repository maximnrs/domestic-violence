from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.schemas import CaseCreate, CaseUpdate, CaseResponse
from app.models.user import User
from app.services import case as case_service
from app.services.auth import get_current_user

router = APIRouter(prefix="/cases", tags=["Cases"])

@router.post("/", response_model=CaseResponse)
async def create_case(
    data: CaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await case_service.create_case(db, current_user.user_id, data)

@router.get("/", response_model=list[CaseResponse])
async def get_cases(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await case_service.get_cases(db, current_user.user_id)

@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await case_service.get_case(db, current_user.user_id, case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: int,
    data: CaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await case_service.update_case(db, current_user.user_id, case_id, data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))