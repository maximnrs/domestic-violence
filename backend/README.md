# Backend API

The backend is a FastAPI service for Nura. It manages authentication, cases, incidents, evidence metadata, encrypted evidence storage, evidence downloads, and transcription requests.

## Responsibilities

- Register and authenticate users with bearer tokens.
- Manage one active case per user and related incident records.
- Upload evidence files, store encrypted objects in MinIO, and persist metadata in PostgreSQL.
- Store cryptographic material through OpenBao / Vault-compatible secret storage.
- Request trusted timestamp metadata for uploaded evidence.
- Route audio transcription requests to the Whisper service.

## Requirements

- Python 3.11+
- PostgreSQL
- MinIO or S3-compatible object storage
- OpenBao or Vault-compatible KV storage

## Configuration

The API loads settings from environment variables. The current `Settings` class also points at `../.env`, so a root-level `.env` is convenient for local development.

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/domestic_violence
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=evidence
VAULT_URL=http://localhost:8200
VAULT_TOKEN=your-vault-token
SECRET_KEY=replace-with-a-long-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
TSA_URL=http://timestamp.sectigo.com/rfc3161
TSA_TIMEOUT_SECONDS=10
CORS_ALLOW_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
```

## Local Development

Install dependencies and start the API:

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API is available at:

- Health check: `http://localhost:8000/health`
- Swagger docs: `http://localhost:8000/docs`

## Database

The project currently includes a SQL migration for trusted timestamp columns:

```bash
psql "postgresql://user:password@localhost:5432/domestic_violence" -f migrations/20260615_add_evidence_timestamp_columns.sql
```

Tests create schemas from SQLAlchemy metadata, but local and production environments should use explicit migrations or managed schema setup.

## OpenBao Setup

The backend stores AES and HMAC keys in an OpenBao KV v2 mount named `Domestic`. Make sure that mount exists before uploading evidence:

```bash
bao secrets enable -path=Domestic kv-v2
```

## Main Routes

| Route group | Purpose |
| --- | --- |
| `/auth` | Registration, login, current user lookup. |
| `/cases` | User and admin case operations. |
| `/incidents` | Incident create, list, detail, and update operations. |
| `/evidence` | Evidence upload, listing, metadata, type lookup, and download. |
| `/evidence-types` | Evidence type management routes. |
| `/transcriptions` | Stored-evidence and demo audio transcription endpoints. |

## Testing

Run unit tests:

```bash
pytest
```

Run integration tests after starting the root integration services:

```bash
docker compose -f ..\docker-compose.integration.yml up -d
$env:RUN_INTEGRATION_TESTS="1"
pytest tests/integration
```

## Notes

- The transcription client currently posts to a hardcoded Whisper service URL in `app/services/transcription.py`.
- Evidence downloads return hex-encoded bytes in JSON.
- Keep real database credentials, Vault tokens, MinIO keys, and JWT secrets out of source control.
