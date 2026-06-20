from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.user import User
from app.services.auth import get_current_user
from app.services import transcription as transcription_service

router = APIRouter(prefix="/transcriptions", tags=["Transcriptions"])


class TranscribeEvidenceRequest(BaseModel):
    evidence_id: int


@router.post("/")
async def transcribe_evidence(
    request: TranscribeEvidenceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Transcribe a stored audio evidence file.
    Downloads the encrypted audio from MinIO, decrypts it,
    sends it to the Whisper service, and returns the transcript.
    """
    try:
        result = await transcription_service.transcribe_evidence(
            db, current_user.user_id, request.evidence_id
        )
        return {"evidence_id": request.evidence_id, **result}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/demo")
async def transcribe_demo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Demo endpoint for the legal dashboard showcase.
    Accepts a direct audio file upload and returns the transcript
    without touching the evidence database.
    """
    try:
        file_bytes = await file.read()
        result = await transcription_service.transcribe_upload(
            file_bytes, file.filename or "audio.m4a"
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
