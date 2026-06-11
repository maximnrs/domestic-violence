import os
import re
import uuid
from datetime import datetime, timezone
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from utils import (
    get_openbao_client,
    get_hmac_key,
    compute_hmac,
    get_minio_client,
    upload_file,
    download_file,
    get_db_connection,
    save_file_record,
    get_all_file_records,
    get_file_record,
    write_audit_log,
    get_audit_logs,
    update_file_status,
)

app = FastAPI(
    title="Evidence Integrity System — API",
    description=(
        "Upload digital evidence. Files are stored in MinIO, fingerprinted with"
        " HMAC-SHA-256, and verified by the Integrity Checker."
    ),
    version="1.0.0",
)

BUCKET = os.environ["MINIO_BUCKET"]

_SAFE_FILENAME = re.compile(r"[^\w.\-]")


def _safe_name(filename: str) -> str:
    """Strip path components and replace unsafe characters."""
    base = os.path.basename(filename or "upload")
    return _SAFE_FILENAME.sub("_", base) or "upload"


# ── Upload evidence ───────────────────────────────────────────────────────────

@app.post("/evidence/upload", summary="Upload a piece of evidence")
async def upload_evidence(file: UploadFile = File(...)):
    """
    Upload a file as evidence.
    - Saves metadata in PostgreSQL first (status: pending).
    - Stores the file in MinIO.
    - Computes HMAC-SHA-256 using the key from OpenBao.
    - Marks the record as verified on success.
    """
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")

    object_key = f"{uuid.uuid4()}_{_safe_name(file.filename)}"

    bao = get_openbao_client()
    key = get_hmac_key(bao)
    fingerprint = compute_hmac(data, key)
    minio = get_minio_client()

    # DB record is created first so there is never an orphaned MinIO object.
    conn = get_db_connection()
    try:
        file_id = save_file_record(
            conn, file.filename, object_key, fingerprint, status="pending"
        )
        upload_file(minio, BUCKET, object_key, data)
        write_audit_log(conn, object_key, "ok", fingerprint, fingerprint, "Uploaded")
        update_file_status(conn, object_key, "verified")
    finally:
        conn.close()

    return {
        "id": file_id,
        "filename": file.filename,
        "object_key": object_key,
        "hmac_hash": fingerprint,
        "integrity_check": "ok",
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }


# ── List all evidence ─────────────────────────────────────────────────────────

@app.get("/evidence", summary="List all uploaded evidence files")
def list_evidence():
    conn = get_db_connection()
    try:
        records = get_all_file_records(conn)
    finally:
        conn.close()
    for r in records:
        if r.get("uploaded_at"):
            r["uploaded_at"] = r["uploaded_at"].isoformat()
    return records


# ── Manual integrity check ────────────────────────────────────────────────────

@app.post(
    "/evidence/{object_key:path}/check",
    summary="Manually trigger an integrity check",
)
def check_evidence(object_key: str):
    """
    Re-download the file from MinIO, recompute HMAC-SHA-256,
    compare to stored fingerprint, write audit log.
    """
    conn = get_db_connection()
    try:
        record = get_file_record(conn, object_key)
        if not record:
            raise HTTPException(status_code=404, detail="File not found.")

        bao = get_openbao_client()
        key = get_hmac_key(bao)
        minio = get_minio_client()

        data = download_file(minio, BUCKET, object_key)
        computed = compute_hmac(data, key)
        stored = record["hmac_hash"]
        result = "ok" if computed == stored else "tampered"

        write_audit_log(conn, object_key, result, stored, computed, "Manual check via API")
        update_file_status(conn, object_key, result)

        if result == "tampered":
            return JSONResponse(
                status_code=200,
                content={
                    "object_key": object_key,
                    "result": "tampered",
                    "alert": "TAMPERING DETECTED — stored hash does not match computed hash.",
                    "stored_hash": stored,
                    "computed_hash": computed,
                },
            )

        return {
            "object_key": object_key,
            "result": "ok",
            "message": "File integrity verified. No tampering detected.",
            "hash": computed,
        }
    finally:
        conn.close()


# ── Audit logs ────────────────────────────────────────────────────────────────

@app.get("/audit-logs", summary="View all audit logs")
def all_audit_logs():
    conn = get_db_connection()
    try:
        logs = get_audit_logs(conn)
    finally:
        conn.close()
    for log in logs:
        if log.get("check_time"):
            log["check_time"] = log["check_time"].isoformat()
    return logs


@app.get("/audit-logs/{object_key:path}", summary="View audit logs for a specific file")
def file_audit_logs(object_key: str):
    conn = get_db_connection()
    try:
        logs = get_audit_logs(conn, object_key)
    finally:
        conn.close()
    for log in logs:
        if log.get("check_time"):
            log["check_time"] = log["check_time"].isoformat()
    return logs


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", summary="Health check")
def health():
    return {"status": "ok"}
