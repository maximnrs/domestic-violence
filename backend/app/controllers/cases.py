from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.schemas import CaseCreate, CaseUpdate, CaseResponse
from app.models.user import User
from app.services import case as case_service
from app.services.auth import get_current_user

router = APIRouter(prefix="/cases", tags=["Cases"])

@router.post(
    "/",
    response_model=CaseResponse,
    responses={409: {"description": "User already has a case"}},
)
async def create_case(
    data: CaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await case_service.create_case(db, current_user.user_id, data)
    except case_service.DuplicateCaseError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

@router.get(
    "/",
    response_model=list[CaseResponse],
    responses={409: {"description": "Multiple cases found for user"}},
)
async def get_cases(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await case_service.get_cases(db, current_user.user_id)
    except case_service.DuplicateCaseError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

@router.get(
    "/me",
    response_model=CaseResponse,
    responses={
        404: {"description": "Case not found"},
        409: {"description": "Multiple cases found for user"},
    },
)
async def get_my_case(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await case_service.get_user_case(db, current_user.user_id)
    except case_service.CaseNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except case_service.DuplicateCaseError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

@router.get(
    "/{case_id}",
    response_model=CaseResponse,
    responses={404: {"description": "Case not found"}},
)
async def get_case(
    case_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await case_service.get_case(db, current_user.user_id, case_id)
    except case_service.CaseNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.put(
    "/{case_id}",
    response_model=CaseResponse,
    responses={404: {"description": "Case not found"}},
)
async def update_case(
    case_id: int,
    data: CaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await case_service.update_case(db, current_user.user_id, case_id, data)
    except case_service.CaseNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
