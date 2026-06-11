import hmac
import hashlib
import os
import hvac
import psycopg2
from minio import Minio


# ── OpenBao ──────────────────────────────────────────────────────────────────

def get_openbao_client() -> hvac.Client:
    client = hvac.Client(
        url=os.environ["OPENBAO_ADDR"],
        token=os.environ["OPENBAO_TOKEN"],
    )
    return client


def get_hmac_key(client: hvac.Client) -> bytes:
    """Retrieve HMAC secret key from OpenBao. Creates one only on a genuine first run."""
    path = os.environ["HMAC_SECRET_PATH"]
    try:
        secret = client.secrets.kv.v2.read_secret_version(path=path)
        return bytes.fromhex(secret["data"]["data"]["key"])
    except hvac.exceptions.InvalidPath:
        # Secret genuinely does not exist yet — generate and store it once.
        key = os.urandom(32)
        client.secrets.kv.v2.create_or_update_secret(
            path=path,
            secret={"key": key.hex()},
        )
        return key
    # All other exceptions (network error, bad token, permission denied) propagate
    # so callers can log and retry instead of silently overwriting the real key.


# ── HMAC ─────────────────────────────────────────────────────────────────────

def compute_hmac(data: bytes, key: bytes) -> str:
    return hmac.new(key, data, hashlib.sha256).hexdigest()


# ── MinIO ─────────────────────────────────────────────────────────────────────

def get_minio_client() -> Minio:
    return Minio(
        endpoint=os.environ["MINIO_ENDPOINT"],
        access_key=os.environ["MINIO_ACCESS_KEY"],
        secret_key=os.environ["MINIO_SECRET_KEY"],
        secure=False,
    )


def ensure_bucket(client: Minio, bucket: str) -> None:
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)


def upload_file(client: Minio, bucket: str, object_key: str, data: bytes) -> None:
    import io
    ensure_bucket(client, bucket)
    client.put_object(bucket, object_key, io.BytesIO(data), length=len(data))


def download_file(client: Minio, bucket: str, object_key: str) -> bytes:
    response = client.get_object(bucket, object_key)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


# ── PostgreSQL ────────────────────────────────────────────────────────────────

def get_db_connection():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def save_file_record(
    conn,
    filename: str,
    object_key: str,
    hmac_hash: str,
    status: str = "pending",
) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO evidence_files (filename, object_key, hmac_hash, status)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (object_key) DO UPDATE
              SET hmac_hash = EXCLUDED.hmac_hash, status = EXCLUDED.status
            RETURNING id
            """,
            (filename, object_key, hmac_hash, status),
        )
        row = cur.fetchone()
        conn.commit()
        return row[0]


def get_all_file_records(conn) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, filename, object_key, hmac_hash, uploaded_at, status"
            " FROM evidence_files"
        )
        cols = [desc[0] for desc in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]


def get_file_record(conn, object_key: str) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, filename, object_key, hmac_hash, uploaded_at, status"
            " FROM evidence_files WHERE object_key = %s",
            (object_key,),
        )
        cols = [desc[0] for desc in cur.description]
        row = cur.fetchone()
        return dict(zip(cols, row)) if row else None


def update_file_status(conn, object_key: str, status: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE evidence_files SET status = %s WHERE object_key = %s",
            (status, object_key),
        )
        conn.commit()


def write_audit_log(
    conn,
    object_key: str,
    result: str,
    stored_hash: str,
    computed_hash: str,
    message: str,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO audit_logs (object_key, result, stored_hash, computed_hash, message)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (object_key, result, stored_hash, computed_hash, message),
        )
        conn.commit()


def get_audit_logs(conn, object_key: str = None) -> list[dict]:
    with conn.cursor() as cur:
        if object_key is not None:
            cur.execute(
                "SELECT * FROM audit_logs WHERE object_key = %s"
                " ORDER BY check_time DESC",
                (object_key,),
            )
        else:
            cur.execute("SELECT * FROM audit_logs ORDER BY check_time DESC")
        cols = [desc[0] for desc in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
