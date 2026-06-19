"""
Integrity Checker — periodic background process.

Reads evidence from the Nura API database, downloads each encrypted file
from MinIO, retrieves the per-file HMAC key from Vault, recomputes the
HMAC-SHA-256 fingerprint, and compares it to the stored hash.

Results are written to:
  - encryption.integrity_status / encryption.hmac_verified_at
  - integrity_check_log (created automatically on first run)

Note: files uploaded before api-server-fix/vault.py was applied will be
marked 'unverifiable' because their HMAC key was not stored in Vault.
"""

import time
import hmac as hmac_lib
import hashlib
import base64
import logging
import psycopg2
import hvac
from minio import Minio
from datetime import datetime, timezone
from config import settings as config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [INTEGRITY] %(levelname)s %(message)s",
)
log = logging.getLogger(__name__)


# ── Clients ───────────────────────────────────────────────────────────────────

def get_db():
    return psycopg2.connect(config.DATABASE_URL)


def get_vault_client() -> hvac.Client:
    return hvac.Client(
        url=config.VAULT_URL,
        token=config.VAULT_TOKEN,
        verify=not config.VAULT_SKIP_VERIFY,
    )


def get_minio() -> Minio:
    endpoint = config.MINIO_ENDPOINT.replace("https://", "").replace("http://", "")
    secure = config.MINIO_ENDPOINT.startswith("https://")
    return Minio(endpoint=endpoint, access_key=config.MINIO_ACCESS_KEY,
                 secret_key=config.MINIO_SECRET_KEY, secure=secure)


# ── Vault ─────────────────────────────────────────────────────────────────────

def get_hmac_key(vault_client: hvac.Client, vault_path: str) -> bytes:
    secret = vault_client.secrets.kv.v2.read_secret_version(
        path=vault_path, mount_point="Domestic"
    )
    data = secret["data"]["data"]
    if "hmac_key" not in data:
        raise KeyError(
            "hmac_key not in Vault — file uploaded before the fix. "
            "Apply api-server-fix/ to the API-Server and re-upload."
        )
    return base64.b64decode(data["hmac_key"])


# ── DB helpers ────────────────────────────────────────────────────────────────

def ensure_log_table(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS integrity_check_log (
                id            SERIAL PRIMARY KEY,
                evidence_id   INTEGER NOT NULL,
                result        VARCHAR(20) NOT NULL,
                stored_hash   TEXT,
                computed_hash TEXT,
                message       TEXT,
                checked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)
        conn.commit()


def get_evidence_list(conn) -> list:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT e.evidence_id, e.file_name, e.file_path,
                   enc.crypto_id, enc.hmac_hash, enc.aes_key_reference
            FROM   evidence e
            JOIN   encryption enc ON e.evidence_id = enc.evidence_id
        """)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]


def set_status(conn, crypto_id: int, status: str):
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE encryption SET integrity_status=%s, hmac_verified_at=NOW() WHERE crypto_id=%s",
            (status, crypto_id),
        )
        conn.commit()


def log_result(conn, evidence_id, result, stored, computed, message):
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO integrity_check_log (evidence_id,result,stored_hash,computed_hash,message)"
            " VALUES (%s,%s,%s,%s,%s)",
            (evidence_id, result, stored, computed, message),
        )
        conn.commit()


# ── Main loop ─────────────────────────────────────────────────────────────────

def run_checks():
    log.info("Starting integrity check cycle...")
    conn = get_db()
    try:
        ensure_log_table(conn)
        evidence_list = get_evidence_list(conn)

        if not evidence_list:
            log.info("No evidence files in database.")
            return

        vault_client = get_vault_client()
        minio_client = get_minio()

        log.info(f"Checking {len(evidence_list)} file(s)...")
        ok = tampered = skipped = 0

        for rec in evidence_list:
            eid   = rec["evidence_id"]
            fname = rec["file_name"]
            fpath = rec["file_path"]
            cid   = rec["crypto_id"]
            stored_hash = rec["hmac_hash"]
            vault_path  = rec["aes_key_reference"]

            try:
                hmac_key  = get_hmac_key(vault_client, vault_path)
                response  = minio_client.get_object(config.MINIO_BUCKET, fpath)
                try:
                    file_data = response.read()
                finally:
                    response.close()
                    response.release_conn()

                computed_hash = hmac_lib.new(hmac_key, file_data, hashlib.sha256).hexdigest()
                result = "verified" if computed_hash == stored_hash else "tampered"

                set_status(conn, cid, result)
                log_result(conn, eid, result, stored_hash, computed_hash, "Scheduled check")

                if result == "tampered":
                    tampered += 1
                    log.warning("=" * 60)
                    log.warning(f"TAMPERING DETECTED  [{eid}] {fname}")
                    log.warning(f"  Stored  : {stored_hash}")
                    log.warning(f"  Computed: {computed_hash}")
                    log.warning(f"  Time    : {datetime.now(timezone.utc).isoformat()}")
                    log.warning("=" * 60)
                else:
                    ok += 1
                    log.info(f"  OK  [{eid}] {fname}")

            except KeyError as exc:
                skipped += 1
                log.warning(f"  SKIP [{eid}] {fname}: {exc}")
                try:
                    set_status(conn, cid, "unverifiable")
                    log_result(conn, eid, "unverifiable", stored_hash, "", str(exc))
                except Exception:
                    pass

            except Exception as exc:
                log.error(f"  ERROR [{eid}] {fname}: {exc}")
                try:
                    log_result(conn, eid, "error", stored_hash, "", str(exc))
                except Exception:
                    pass

        log.info(f"Done — OK: {ok} | Tampered: {tampered} | Unverifiable: {skipped}")
    finally:
        conn.close()


def wait_for_services():
    log.info("Waiting for services...")
    for _ in range(30):
        try:
            conn = get_db()
            ensure_log_table(conn)
            conn.close()
            if not get_vault_client().is_authenticated():
                raise Exception("Vault token invalid")
            log.info("Services ready.")
            return
        except Exception as exc:
            log.info(f"  Not ready: {exc}")
            time.sleep(5)
    log.error("Services never became ready.")
    raise SystemExit(1)


if __name__ == "__main__":
    wait_for_services()
    log.info(f"Interval: {config.CHECK_INTERVAL_SECONDS}s")
    while True:
        try:
            run_checks()
        except Exception as exc:
            log.error(f"Unexpected error: {exc}")
        time.sleep(config.CHECK_INTERVAL_SECONDS)
