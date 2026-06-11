"""
Integrity Checker — scheduled background process.

Runs every CHECK_INTERVAL_SECONDS (default: 60).
For each evidence file in PostgreSQL:
  1. Downloads the file from MinIO.
  2. Retrieves the HMAC key from OpenBao.
  3. Recomputes the HMAC-SHA-256 fingerprint.
  4. Compares it to the stored hash.
  5. Writes the result to audit_logs.
  6. Updates the file status to 'tampered' if mismatch detected.
  7. Triggers an alert (logged to stdout) if tampering is found.
"""

import os
import time
import hmac
import hashlib
import logging
import psycopg2
import hvac
from minio import Minio
from datetime import datetime, timezone

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [INTEGRITY CHECKER] %(levelname)s %(message)s",
)
log = logging.getLogger(__name__)

BUCKET = os.environ["MINIO_BUCKET"]
INTERVAL = int(os.environ.get("CHECK_INTERVAL_SECONDS", 60))


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def get_minio():
    return Minio(
        endpoint=os.environ["MINIO_ENDPOINT"],
        access_key=os.environ["MINIO_ACCESS_KEY"],
        secret_key=os.environ["MINIO_SECRET_KEY"],
        secure=False,
    )


def get_hmac_key() -> bytes:
    client = hvac.Client(
        url=os.environ["OPENBAO_ADDR"],
        token=os.environ["OPENBAO_TOKEN"],
    )
    path = os.environ["HMAC_SECRET_PATH"]
    secret = client.secrets.kv.v2.read_secret_version(path=path)
    return bytes.fromhex(secret["data"]["data"]["key"])


def compute_hmac(data: bytes, key: bytes) -> str:
    return hmac.new(key, data, hashlib.sha256).hexdigest()


def download_file(minio: Minio, object_key: str) -> bytes:
    response = minio.get_object(BUCKET, object_key)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def write_audit_log(conn, object_key, result, stored, computed, message):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO audit_logs (object_key, result, stored_hash, computed_hash, message)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (object_key, result, stored, computed, message),
        )
        conn.commit()


def update_status(conn, object_key, status):
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE evidence_files SET status = %s WHERE object_key = %s",
            (status, object_key),
        )
        conn.commit()


def alert(object_key: str, stored: str, computed: str):
    """Alert system — logs to stdout. Can be extended to email/webhook."""
    log.warning("=" * 60)
    log.warning("TAMPERING DETECTED")
    log.warning(f"   File      : {object_key}")
    log.warning(f"   Stored    : {stored}")
    log.warning(f"   Computed  : {computed}")
    log.warning(f"   Time      : {datetime.now(timezone.utc).isoformat()}")
    log.warning("=" * 60)


# ── Main check loop ───────────────────────────────────────────────────────────

def run_checks():
    log.info("Starting scheduled integrity check...")

    try:
        key = get_hmac_key()
    except Exception as e:
        log.error(f"Could not retrieve HMAC key from OpenBao: {e}")
        return

    try:
        conn = get_db()
    except Exception as e:
        log.error(f"Could not connect to database: {e}")
        return

    try:
        minio = get_minio()

        with conn.cursor() as cur:
            cur.execute("SELECT object_key, hmac_hash FROM evidence_files")
            files = cur.fetchall()

        if not files:
            log.info("No evidence files found. Nothing to check.")
            return

        log.info(f"Checking {len(files)} file(s)...")
        ok_count = 0
        tampered_count = 0

        for object_key, stored_hash in files:
            try:
                data = download_file(minio, object_key)
                computed_hash = compute_hmac(data, key)
                result = "ok" if computed_hash == stored_hash else "tampered"

                write_audit_log(
                    conn, object_key, result, stored_hash, computed_hash,
                    "Scheduled check"
                )
                update_status(conn, object_key, result)

                if result == "tampered":
                    tampered_count += 1
                    alert(object_key, stored_hash, computed_hash)
                else:
                    ok_count += 1
                    log.info(f"  OK {object_key}")

            except Exception as e:
                log.error(f"  Error checking {object_key}: {e}")
                try:
                    write_audit_log(conn, object_key, "error", stored_hash, "", str(e))
                except Exception as audit_err:
                    log.error(f"  Could not write audit log for {object_key}: {audit_err}")

        log.info(f"Check complete. OK: {ok_count} | Tampered: {tampered_count}")

    finally:
        conn.close()


def wait_for_services():
    """Wait until PostgreSQL and OpenBao are reachable before starting.

    The HMAC key may not exist yet on a fresh deployment — it is created by
    the API on the first upload. run_checks handles that gracefully.
    """
    log.info("Waiting for services to be ready...")
    for _ in range(30):
        try:
            conn = get_db()
            conn.close()
            # Verify OpenBao is reachable and the token is valid.
            # We do NOT check for the HMAC key here because it is
            # created lazily by the API on the first file upload.
            client = hvac.Client(
                url=os.environ["OPENBAO_ADDR"],
                token=os.environ["OPENBAO_TOKEN"],
            )
            if not client.is_authenticated():
                raise Exception("OpenBao token is not authenticated")
            log.info("Services ready.")
            return
        except Exception:
            time.sleep(5)
    log.error("Services did not become ready in time. Exiting.")
    raise SystemExit(1)


if __name__ == "__main__":
    wait_for_services()
    log.info(f"Integrity Checker started. Interval: {INTERVAL}s")
    while True:
        try:
            run_checks()
        except Exception as e:
            log.error(f"Unexpected error in run_checks: {e}")
        time.sleep(INTERVAL)
