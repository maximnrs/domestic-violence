# Whisper Service

The Whisper service is a lightweight Flask API that transcribes uploaded audio files with `faster-whisper`.

## Responsibilities

- Accept audio uploads over HTTP.
- Run local speech-to-text transcription with the `large-v3-turbo` model.
- Return full transcript text, detected language, language confidence, and timestamped segments.

## Requirements

- Python 3.11+
- Enough local CPU and memory to run `faster-whisper`

The service currently runs the model on CPU with `int8` compute:

```python
WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")
```

## Local Development

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

The service starts at `http://localhost:5000`.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service health check. |
| `POST` | `/transcribe` | Multipart audio upload transcription. |

Example:

```bash
curl -X POST http://localhost:5000/transcribe -F "file=@sample.m4a"
```

Example response shape:

```json
{
  "text": "Full transcript text.",
  "language": "en",
  "language_probability": 0.9912,
  "segments": [
    {
      "start": 0.0,
      "end": 3.4,
      "text": "Full transcript text."
    }
  ]
}
```

## Integration

- The legal dashboard can call this service directly by setting `VITE_WHISPER_URL=http://localhost:5000/transcribe`.
- The backend transcription service currently uses a fixed LAN URL in `backend/app/services/transcription.py`; update that value for your environment if routing transcription through FastAPI.

## Notes

- The first request may be slow because the model must be loaded or downloaded by the runtime.
- CORS is enabled for local browser-based dashboard workflows.
- Uploaded files are written to a temporary file and removed after transcription.
