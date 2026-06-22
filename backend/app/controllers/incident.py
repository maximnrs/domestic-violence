from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.schemas import IncidentCreate, IncidentUpdate, IncidentResponse
from app.models.user import User
from app.services import incident as incident_service
from app.services.auth import get_current_user

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.post("/", response_model=IncidentResponse)
async def create_incident(
    data: IncidentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await incident_service.create_incident(db, current_user.user_id, data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/", response_model=list[IncidentResponse])
async def get_incidents(
    case_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await incident_service.get_incidents(db, current_user.user_id, case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/admin/", response_model=list[IncidentResponse])
async def get_admin_incidents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await incident_service.get_all_incidents(db)

@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await incident_service.get_incident(db, current_user.user_id, incident_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: int,
    data: IncidentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await incident_service.update_incident(db, current_user.user_id, incident_id, data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
