from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from utils import (
    get_vault_client,
    get_hmac_key,
    compute_hmac,
    get_minio_client,
    download_file,
    get_db_connection,
    ensure_integrity_log_table,
    get_all_evidence,
    get_evidence_by_id,
    update_encryption_status,
    write_integrity_log,
    get_integrity_logs,
)

app = FastAPI(
    title="Evidence Integrity Monitor",
    description="Monitors HMAC-SHA-256 integrity of evidence files stored in MinIO.",
    version="2.0.0",
)

_DASHBOARD = Path(__file__).parent / "dashboard.html"


# ── Dashboard ─────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def dashboard():
    return _DASHBOARD.read_text(encoding="utf-8")


# ── Evidence list ─────────────────────────────────────────────────────────────

@app.get("/evidence", summary="List all evidence files with integrity status")
def list_evidence():
    conn = get_db_connection()
    try:
        ensure_integrity_log_table(conn)
        return get_all_evidence(conn)
    finally:
        conn.close()


# ── Manual check ──────────────────────────────────────────────────────────────

@app.post("/evidence/{evidence_id}/check", summary="Manually trigger an integrity check")
def check_evidence(evidence_id: int):
    conn = get_db_connection()
    try:
        ensure_integrity_log_table(conn)
        record = get_evidence_by_id(conn, evidence_id)
        if not record:
            raise HTTPException(status_code=404, detail="Evidence not found.")

        vault_client = get_vault_client()
        vault_path   = record["aes_key_reference"]
        stored_hash  = record["hmac_hash"]

        try:
            hmac_key = get_hmac_key(vault_client, vault_path)
        except KeyError as exc:
            update_encryption_status(conn, record["crypto_id"], "unverifiable")
            write_integrity_log(conn, evidence_id, "unverifiable", stored_hash, "", str(exc))
            return JSONResponse(status_code=200, content={
                "evidence_id": evidence_id,
                "result": "unverifiable",
                "message": str(exc),
            })

        minio_client  = get_minio_client()
        file_data     = download_file(minio_client, record["file_path"])
        computed_hash = compute_hmac(file_data, hmac_key)
        result        = "verified" if computed_hash == stored_hash else "tampered"

        update_encryption_status(conn, record["crypto_id"], result)
        write_integrity_log(conn, evidence_id, result, stored_hash, computed_hash, "Manual check")

        if result == "tampered":
            return JSONResponse(status_code=200, content={
                "evidence_id": evidence_id,
                "result": "tampered",
                "alert": "TAMPERING DETECTED — stored hash does not match computed hash.",
                "stored_hash": stored_hash,
                "computed_hash": computed_hash,
            })

        return {
            "evidence_id": evidence_id,
            "result": "verified",
            "message": "File integrity confirmed. No tampering detected.",
            "hash": computed_hash,
        }
    finally:
        conn.close()


# ── Integrity logs ────────────────────────────────────────────────────────────

@app.get("/integrity-logs", summary="View all integrity check log entries")
def all_integrity_logs():
    conn = get_db_connection()
    try:
        ensure_integrity_log_table(conn)
        return get_integrity_logs(conn)
    finally:
        conn.close()


@app.get("/integrity-logs/{evidence_id}", summary="View integrity log for a specific file")
def evidence_integrity_logs(evidence_id: int):
    conn = get_db_connection()
    try:
        ensure_integrity_log_table(conn)
        return get_integrity_logs(conn, evidence_id)
    finally:
        conn.close()


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", summary="Health check")
def health():
    return {"status": "ok", "version": "utc-fix-3"}
