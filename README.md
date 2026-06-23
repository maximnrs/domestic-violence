# Nura Evidence Platform

Nura is a secure evidence-management platform for documenting domestic-violence incidents, preserving uploaded evidence, and preparing legal review workflows. The repository is organized as a monorepo with a FastAPI backend, an Expo mobile app, a React legal dashboard, a local Whisper transcription service, and a separate integrity-monitoring service.

The system is designed around authenticated case and incident records, encrypted evidence storage, trusted timestamp metadata, and HMAC-based integrity checks.

## Repository Structure

| Path | Purpose |
| --- | --- |
| `backend/` | FastAPI API for authentication, cases, incidents, evidence, metadata, and transcription routing. |
| `mobile-app-frontend/domestic-violence-app/` | Expo / React Native app for client-side evidence capture and case interaction. |
| `legal-dashboard-frontend/` | Vite / React dashboard for legal or administrative review workflows. |
| `whisper-service/` | Flask service that transcribes uploaded audio with `faster-whisper`. |
| `integrity-checker/` | FastAPI dashboard and scheduled worker for HMAC evidence verification. |
| `docker-compose.integration.yml` | Local infrastructure for backend integration tests: PostgreSQL, MinIO, and OpenBao. |

Multiple README files are appropriate in this repository because each top-level service has its own runtime, dependencies, and setup flow. The root README explains the whole system; service READMEs explain how to work inside each independently runnable project.

## Architecture

```text
Mobile app / Legal dashboard
            |
            v
FastAPI backend ----> PostgreSQL
     |       |
     |       +------> OpenBao / Vault-compatible secret storage
     |       |
     |       +------> MinIO object storage
     |
     +--------------> Whisper transcription service

Integrity checker ---> PostgreSQL + MinIO + OpenBao
```

## Prerequisites

- Python 3.11+
- Node.js 20+ and npm
- Docker Desktop or another Docker Compose compatible runtime
- Expo tooling for mobile development

## Environment

The backend expects the following variables. Create an environment file appropriate for your local workflow before starting the API.

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/domestic_violence
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=evidence
VAULT_URL=http://localhost:8200
VAULT_TOKEN=your-vault-token
SECRET_KEY=replace-with-a-long-random-secret
CORS_ALLOW_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
```

Frontend environment variables:

```env
# mobile-app-frontend/domestic-violence-app/.env
EXPO_PUBLIC_API_URL=http://localhost:8000

# legal-dashboard-frontend/.env
VITE_API_URL=http://localhost:8000
VITE_WHISPER_URL=http://localhost:5000/transcribe
```

The legal dashboard can also use `VITE_DASHBOARD_AUTO_LOGIN`, `VITE_DASHBOARD_EMAIL`, and `VITE_DASHBOARD_PASSWORD` for local demo sessions.

## Getting Started

Start local test infrastructure:

```bash
docker compose -f docker-compose.integration.yml up -d
```

This Compose file starts supporting services for tests. It does not run the application services or apply the application database schema. For backend evidence uploads, OpenBao must expose a KV v2 mount named `Domestic`.

Run the backend:

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Run the legal dashboard:

```bash
cd legal-dashboard-frontend
npm install
npm run dev
```

Run the mobile app:

```bash
cd mobile-app-frontend/domestic-violence-app
npm install
npx expo start
```

Run the Whisper service:

```bash
cd whisper-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

## Testing

Backend unit tests:

```bash
cd backend
pytest
```

Backend integration tests require the services in `docker-compose.integration.yml`:

```bash
docker compose -f docker-compose.integration.yml up -d
cd backend
$env:RUN_INTEGRATION_TESTS="1"
pytest tests/integration
```

Frontend builds:

```bash
cd legal-dashboard-frontend
npm run build

cd ../mobile-app-frontend/domestic-violence-app
npm run lint
```

## Security Notes

- Do not commit real `.env` files, production tokens, MinIO credentials, database passwords, or JWT secrets.
- OpenBao/Vault and MinIO settings must match between the backend and integrity checker.
- The backend stores trusted timestamp metadata for evidence when timestamping succeeds.
- The integrity checker verifies evidence by recomputing HMAC-SHA-256 values against keys stored in OpenBao.
- The current backend transcription service points to a fixed LAN Whisper URL in `backend/app/services/transcription.py`; update that value for your environment before relying on backend-routed transcription.

## Additional Documentation

- [Backend API](backend/README.md)
- [Legal dashboard](legal-dashboard-frontend/README.md)
- [Mobile app](mobile-app-frontend/domestic-violence-app/README.md)
- [Whisper service](whisper-service/README.md)
- [Integrity checker](integrity-checker/README.md)
