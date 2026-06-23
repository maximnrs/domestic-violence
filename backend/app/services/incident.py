from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.incident import Incident
from app.models.case import Case
from app.models.schemas import IncidentCreate, IncidentUpdate

async def verify_case_ownership(db: AsyncSession, case_id: int, user_id: int):
    # Make sure the case belongs to this user before doing anything with its incidents
    result = await db.execute(
        select(Case).where(Case.case_id == case_id, Case.user_id == user_id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise ValueError("Case not found or access denied")

async def create_incident(db: AsyncSession, user_id: int, data: IncidentCreate) -> Incident:
    await verify_case_ownership(db, data.case_id, user_id)
    incident = Incident(
        case_id=data.case_id,
        incident_date=data.incident_date,
        incident_time=data.incident_time,
        location=data.location,
        incident_type=data.incident_type,
        description=data.description
    )
    db.add(incident)
    await db.commit()
    await db.refresh(incident)
    return incident

async def get_incidents(db: AsyncSession, user_id: int, case_id: int) -> list[Incident]:
    await verify_case_ownership(db, case_id, user_id)
    result = await db.execute(
        select(Incident).where(Incident.case_id == case_id)
    )
    return result.scalars().all()

async def get_incidents_for_case(db: AsyncSession, case_id: int) -> list[Incident]:
    result = await db.execute(
        select(Incident).where(Incident.case_id == case_id)
    )
    return result.scalars().all()

async def get_all_incidents(db: AsyncSession) -> list[Incident]:
    result = await db.execute(select(Incident).order_by(Incident.incident_id))
    return result.scalars().all()

async def get_incident(db: AsyncSession, user_id: int, incident_id: int) -> Incident:
    result = await db.execute(
        select(Incident).where(Incident.incident_id == incident_id)
    )
    incident = result.scalar_one_or_none()
    if not incident:
        raise ValueError("Incident not found")
    await verify_case_ownership(db, incident.case_id, user_id)
    return incident

async def update_incident(db: AsyncSession, user_id: int, incident_id: int, data: IncidentUpdate) -> Incident:
    incident = await get_incident(db, user_id, incident_id)
    if data.incident_date is not None:
        incident.incident_date = data.incident_date
    if data.incident_time is not None:
        incident.incident_time = data.incident_time
    if data.location is not None:
        incident.location = data.location
    if data.incident_type is not None:
        incident.incident_type = data.incident_type
    if data.description is not None:
        incident.description = data.description
    await db.commit()
    await db.refresh(incident)
    return incident
