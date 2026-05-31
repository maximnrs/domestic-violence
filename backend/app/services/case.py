from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.case import Case
from app.models.schemas import CaseCreate, CaseUpdate

async def create_case(db: AsyncSession, user_id: int, data: CaseCreate) -> Case:
    case = Case(
        user_id=user_id,
        case_title=data.case_title,
        description=data.description,
        status=data.status
    )
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return case

async def get_cases(db: AsyncSession, user_id: int) -> list[Case]:
    result = await db.execute(select(Case).where(Case.user_id == user_id))
    return result.scalars().all()

async def get_case(db: AsyncSession, user_id: int, case_id: int) -> Case:
    result = await db.execute(
        select(Case).where(Case.case_id == case_id, Case.user_id == user_id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise ValueError("Case not found")
    return case

async def update_case(db: AsyncSession, user_id: int, case_id: int, data: CaseUpdate) -> Case:
    case = await get_case(db, user_id, case_id)
    if data.case_title is not None:
        case.case_title = data.case_title
    if data.description is not None:
        case.description = data.description
    if data.status is not None:
        case.status = data.status
    await db.commit()
    await db.refresh(case)
    return case