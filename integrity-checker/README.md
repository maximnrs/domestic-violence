# Evidence Integrity Checker

The integrity checker verifies that evidence stored in MinIO still matches the HMAC-SHA-256 fingerprints recorded by the Nura backend. It contains a small FastAPI dashboard/API for manual checks and a scheduled worker for continuous verification.

## Architecture

```text
Integrity API / dashboard
Scheduled integrity worker
          |
          +--> PostgreSQL evidence and encryption tables
          +--> MinIO evidence objects
          +--> OpenBao / Vault HMAC keys
```

Verification flow:

1. Read evidence metadata and stored HMAC hashes from PostgreSQL.
2. Retrieve the per-file HMAC key from OpenBao.
3. Download the evidence object from MinIO.
4. Recompute the HMAC-SHA-256 fingerprint.
5. Mark the record as `verified`, `tampered`, `unverifiable`, or `error`.
6. Write the result to `integrity_check_log`.

## Services

| Service | Purpose |
| --- | --- |
| `api/` | FastAPI app with a browser dashboard, evidence list, manual check endpoint, logs, and health check. |
| `integrity_checker/` | Scheduled worker that continuously verifies all evidence records. |
| `api-server-fix/` | Utility scripts related to HMAC key storage and rebaselining older data. |
| `docker/openbao/` | OpenBao Docker support files. |

## Configuration

Copy `.env.example` to `.env` and fill in values that match the main Nura API infrastructure:

```env
DATABASE_URL=postgresql://DB_USER:DB_PASS@192.168.178.X/domestic
MINIO_ENDPOINT=http://192.168.178.X:9000
MINIO_ACCESS_KEY=your_minio_user
MINIO_SECRET_KEY=your_minio_password
MINIO_BUCKET=domestic
VAULT_URL=https://192.168.178.X:8200
VAULT_TOKEN=your_vault_token
VAULT_SKIP_VERIFY=false
CHECK_INTERVAL_SECONDS=60
```

The checker must use the same PostgreSQL database, MinIO bucket, and OpenBao secrets as the backend that uploaded the evidence.

## Running with Docker Compose

From this directory:

```bash
docker compose up --build
```

The current Compose file uses `network_mode: host` so the containers can reach infrastructure on the host or LAN. In that mode, ports are exposed directly by the containers.

Typical URLs:

| Service | URL |
| --- | --- |
| Dashboard | `http://localhost:8001` |
| API docs | `http://localhost:8001/docs` |
| Health check | `http://localhost:8001/health` |

Stop the services:

```bash
docker compose down
```

## API Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | Browser dashboard. |
| `GET` | `/evidence` | List evidence and integrity status. |
| `POST` | `/evidence/{evidence_id}/check` | Manually verify a single evidence file. |
| `GET` | `/integrity-logs` | List integrity check logs. |
| `GET` | `/integrity-logs/{evidence_id}` | List logs for one evidence record. |
| `GET` | `/health` | Health check. |

## Interpreting Results

| Result | Meaning |
| --- | --- |
| `verified` | The recomputed HMAC matches the stored HMAC. |
| `tampered` | The object bytes no longer match the stored HMAC. |
| `unverifiable` | The required HMAC key was not found in OpenBao. |
| `error` | Verification failed for an operational reason such as storage or database access. |

## Notes

- OpenBao/Vault access is security-sensitive. Do not commit real tokens.
- Files uploaded before HMAC keys were stored in OpenBao may be marked `unverifiable`.
- `VAULT_SKIP_VERIFY=true` may be useful for local self-signed certificates, but should not be used casually in production.
