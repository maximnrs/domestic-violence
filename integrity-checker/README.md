# Evidence Integrity System

How digital evidence is stored, protected, and verified.

---

## Architecture

```
Victim Device → API (FastAPI) → MinIO (encrypted storage)
                     ↓                    ↑
               PostgreSQL DB    Integrity Checker (scheduled)
                     ↑                    ↑
                OpenBao (HMAC key management)
```

- **HMAC-SHA-256** fingerprinting (key stored in OpenBao, never alongside files)
- **Integrity Checker** runs on schedule AND is triggered directly on every upload
- **Audit Logs** are insert-only (PostgreSQL rules prevent UPDATE/DELETE)
- **Alert system** logs to stdout when tampering is detected

---

## Start the system

```bash
docker compose up --build
```

Wait ~20 seconds for all services to initialise, then:

| Service        | URL                          |
|----------------|------------------------------|
| API + Swagger  | http://localhost:8000/docs   |
| MinIO Console  | http://localhost:9001        |
| OpenBao        | http://localhost:8200        |
| PostgreSQL     | localhost:5432               |

MinIO login: `minio_admin` / `minio_password`

---

## Test the system

### 1. Upload a file (evidence)

```bash
curl -X POST http://localhost:8000/evidence/upload \
  -F "file=@/path/to/your/file.jpg"
```

Returns the file ID, object key, HMAC hash, and an immediate integrity check result.

### 2. List all uploaded evidence

```bash
curl http://localhost:8000/evidence
```

### 3. Manually trigger an integrity check

Copy the `object_key` from the upload response, then:

```bash
curl -X POST "http://localhost:8000/evidence/<object_key>/check"
```

### 4. Simulate tampering (for testing)

Go to the MinIO console at http://localhost:9001, find the file in the `evidence` bucket, download it, modify it, and re-upload it with the same object key. Then run the check again — it will return `tampered` and write to the audit log.

### 5. View audit logs

```bash
# All logs
curl http://localhost:8000/audit-logs

# Logs for a specific file
curl "http://localhost:8000/audit-logs/<object_key>"
```

---

## Stop the system

```bash
docker compose down
```

To also remove all stored data (volumes):

```bash
docker compose down -v
```

---

## Project structure

```
integrity_checker/
├── docker-compose.yml
├── docker/
│   └── init.sql              # PostgreSQL schema
├── api/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py               # FastAPI routes
│   └── utils.py              # Shared HMAC / MinIO / OpenBao / DB helpers
└── integrity_checker/
    ├── Dockerfile
    ├── requirements.txt
    └── checker.py            # Scheduled integrity check loop
```

---

## Notes

- **Argon2ID** (password hashing) is under research and not yet implemented.
- **Queue system** (Redis/Celery) is under research and not yet implemented.
- OpenBao runs in **dev mode** for local development. For production, use a persistent unsealed Vault/OpenBao instance.
