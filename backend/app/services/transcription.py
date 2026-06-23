import mimetypes
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from app.services import evidence as evidence_service
from app.services import metadata as metadata_service

# Address of the Flask Whisper service running on the local server
WHISPER_URL = "http://192.168.178.73:5000/transcribe"

# Generous timeout (seconds) since large audio files can take a while on CPU
WHISPER_TIMEOUT = 300.0


async def transcribe_evidence(
    db: AsyncSession,
    user_id: int,
    evidence_id: int,
) -> dict:
    """
    Download a stored audio evidence file, send it to the Whisper service,
    and return the transcript result.
    """
    # Get evidence metadata to retrieve the original filename
    evidence = await metadata_service.get_evidence(db, evidence_id, user_id)

    # Download and decrypt the audio bytes from MinIO
    audio_bytes = await evidence_service.download_evidence(db, user_id, evidence_id)

    # Guess the correct MIME type from the filename (e.g. audio/mp4 for .m4a)
    content_type = mimetypes.guess_type(evidence.file_name)[0] or "application/octet-stream"

    async with httpx.AsyncClient(timeout=WHISPER_TIMEOUT) as client:
        response = await client.post(
            WHISPER_URL,
            files={"file": (evidence.file_name, audio_bytes, content_type)},
        )

    if response.status_code != 200:
        raise ValueError(f"Whisper service error: {response.text}")

    return response.json()


async def transcribe_upload(file_bytes: bytes, file_name: str) -> dict:
    """
    Send a directly uploaded audio file to the Whisper service.
    Used by the demo upload path in the legal dashboard.
    """
    content_type = mimetypes.guess_type(file_name)[0] or "application/octet-stream"

    async with httpx.AsyncClient(timeout=WHISPER_TIMEOUT) as client:
        response = await client.post(
            WHISPER_URL,
            files={"file": (file_name, file_bytes, content_type)},
        )

    if response.status_code != 200:
        raise ValueError(f"Whisper service error: {response.text}")

    return response.json()
