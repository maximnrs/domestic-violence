import os
import hmac
import hashlib
import base64
import psycopg2
import hvac
from minio import Minio
from config import settings as config


# ── Vault ─────────────────────────────────────────────────────────────────────

def get_vault_client() -> hvac.Client:
    return hvac.Client(
        url=config.VAULT_URL,
        token=config.VAULT_TOKEN,
        verify=not config.VAULT_SKIP_VERIFY,
    )


def get_hmac_key(client: hvac.Client, vault_path: str) -> bytes:
    """Retrieve per-file HMAC key from Vault (Domestic mount)."""
    secret = client.secrets.kv.v2.read_secret_version(
        path=vault_path, mount_point="Domestic"
    )
    data = secret["data"]["data"]
    if "hmac_key" not in data:
        raise KeyError(
            "hmac_key not in Vault secret — file was uploaded before "
            "the fix was applied. See api-server-fix/."
        )
    return base64.b64decode(data["hmac_key"])


def compute_hmac(data: bytes, key: bytes) -> str:
    return hmac.new(key, data, hashlib.sha256).hexdigest()


# ── MinIO ─────────────────────────────────────────────────────────────────────

def get_minio_client() -> Minio:
    endpoint = config.MINIO_ENDPOINT.replace("https://", "").replace("http://", "")
    secure = config.MINIO_ENDPOINT.startswith("https://")
    return Minio(endpoint=endpoint, access_key=config.MINIO_ACCESS_KEY,
                 secret_key=config.MINIO_SECRET_KEY, secure=secure)


def download_file(client: Minio, file_path: str) -> bytes:
    response = client.get_object(config.MINIO_BUCKET, file_path)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


# ── PostgreSQL ────────────────────────────────────────────────────────────────

def get_db_connection():
    return psycopg2.connect(config.DATABASE_URL)


def ensure_integrity_log_table(conn):
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


def get_all_evidence(conn) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT
                e.evidence_id,
                e.file_name,
                e.file_path,
                e.incident_id,
                e.created_at,
                enc.crypto_id,
                enc.hmac_hash,
                enc.aes_key_reference,
                enc.integrity_status,
                enc.hmac_verified_at
            FROM   evidence e
            JOIN   encryption enc ON e.evidence_id = enc.evidence_id
            ORDER  BY e.created_at DESC
        """)
        cols = [d[0] for d in cur.description]
        rows = []
        for row in cur.fetchall():
            r = dict(zip(cols, row))
            if r.get("created_at"):
                r["created_at"] = r["created_at"].isoformat()
            if r.get("hmac_verified_at"):
                r["hmac_verified_at"] = r["hmac_verified_at"].isoformat()
            rows.append(r)
        return rows


def get_evidence_by_id(conn, evidence_id: int) -> dict | None:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT
                e.evidence_id,
                e.file_name,
                e.file_path,
                e.incident_id,
                e.created_at,
                enc.crypto_id,
                enc.hmac_hash,
                enc.aes_key_reference,
                enc.integrity_status,
                enc.hmac_verified_at
            FROM   evidence e
            JOIN   encryption enc ON e.evidence_id = enc.evidence_id
            WHERE  e.evidence_id = %s
        """, (evidence_id,))
        cols = [d[0] for d in cur.description]
        row = cur.fetchone()
        if not row:
            return None
        r = dict(zip(cols, row))
        if r.get("created_at"):
            r["created_at"] = r["created_at"].isoformat()
        if r.get("hmac_verified_at"):
            r["hmac_verified_at"] = r["hmac_verified_at"].isoformat()
        return r


def update_encryption_status(conn, crypto_id: int, status: str):
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE encryption SET integrity_status=%s, hmac_verified_at=NOW() WHERE crypto_id=%s",
            (status, crypto_id),
        )
        conn.commit()


def write_integrity_log(conn, evidence_id, result, stored_hash, computed_hash, message):
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO integrity_check_log (evidence_id,result,stored_hash,computed_hash,message)"
            " VALUES (%s,%s,%s,%s,%s)",
            (evidence_id, result, stored_hash, computed_hash, message),
        )
        conn.commit()


def get_integrity_logs(conn, evidence_id: int = None) -> list[dict]:
    with conn.cursor() as cur:
        if evidence_id is not None:
            cur.execute(
                "SELECT * FROM integrity_check_log WHERE evidence_id=%s ORDER BY checked_at DESC",
                (evidence_id,),
            )
        else:
            cur.execute("SELECT * FROM integrity_check_log ORDER BY checked_at DESC LIMIT 200")
        cols = [d[0] for d in cur.description]
        rows = []
        for row in cur.fetchall():
            r = dict(zip(cols, row))
            if r.get("checked_at"):
                r["checked_at"] = r["checked_at"].isoformat()
            rows.append(r)
        return rows
