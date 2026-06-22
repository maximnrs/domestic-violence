from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.schemas import EvidenceCreate, EvidenceResponse
from app.models.user import User
from app.services import evidence as evidence_service
from app.services import evidencetype as evidencetype_service
from app.services import incident as incident_service
from app.services.auth import get_current_user

router = APIRouter(prefix="/evidence", tags=["Evidence"])


@router.get("/types/")
async def get_evidence_types(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await evidencetype_service.get_evidence_types(db)


@router.post(
    "/",
    response_model=EvidenceResponse,
    responses={
        400: {"description": "Evidence upload processing failed"},
        404: {"description": "Incident not found or access denied"},
    },
)
async def upload_evidence(
    incident_id: int = Form(...),
    evidence_type_id: int = Form(...),
    file: UploadFile = File(...),
    evidence_location: str | None = Form(None),
    evidence_imei: str | None = Form(None),
    evidence_device: str | None = Form(None),
    evidence_activation: str | None = Form(None),
    description: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        await incident_service.get_incident(db, current_user.user_id, incident_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    try:
        # Read file bytes
        file_bytes = await file.read()
        
        # Create the EvidenceCreate schema
        data = EvidenceCreate(
            incident_id=incident_id,
            evidence_type_id=evidence_type_id,
            evidence_location=evidence_location,
            evidence_imei=evidence_imei,
            evidence_device=evidence_device,
            evidence_activation=evidence_activation,
            description=description
        )
        
        # Upload via service
        evidence = await evidence_service.upload_evidence(
            db,
            current_user.user_id,
            incident_id,
            file.filename,
            file_bytes,
            data
        )
        return evidence
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get(
    "/admin/",
    response_model=list[EvidenceResponse],
)
async def get_admin_incident_evidence(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.services import metadata
    return await metadata.get_incident_evidence_for_admin(db, incident_id)

@router.get(
    "/{evidence_id}",
    response_model=EvidenceResponse,
    responses={404: {"description": "Evidence not found or access denied"}},
)
async def get_evidence(
    evidence_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        from app.services import metadata
        return await metadata.get_evidence(db, evidence_id, current_user.user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get(
    "/",
    response_model=list[EvidenceResponse],
    responses={404: {"description": "Incident evidence not found or access denied"}},
)
async def get_incident_evidence(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        from app.services import metadata
        return await metadata.get_incident_evidence(db, incident_id, current_user.user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get(
    "/{evidence_id}/download",
    responses={404: {"description": "Evidence not found, access denied, or decrypt unavailable"}},
)
async def download_evidence(
    evidence_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        file_bytes = await evidence_service.download_evidence(db, current_user.user_id, evidence_id)
        return {
            "status": "success",
            "message": "Evidence file ready for download",
            "data": file_bytes.hex()  # Return as hex for JSON response
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
