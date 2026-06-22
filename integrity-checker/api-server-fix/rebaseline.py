"""
One-shot migration script — run once on the Proxmox server.

For every evidence file whose Vault secret is missing the hmac_key field,
this script:
  1. Downloads the encrypted file from MinIO.
  2. Generates a fresh HMAC-SHA-256 key.
  3. Computes the HMAC over the file bytes.
  4. Stores the key in Vault alongside the existing AES key.
  5. Updates encryption.hmac_hash in the database.

This establishes a fresh integrity baseline. Files verified from this
point forward will reflect their current state in MinIO.

Usage (run from the integrity-checker directory on Proxmox):
  pip install psycopg2-binary minio hvac python-dotenv
  python api-server-fix/rebaseline.py
"""

import os
import hmac
import hashlib
import base64
import sys

import psycopg2
import hvac
from minio import Minio
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL      = os.environ["DATABASE_URL"]
MINIO_ENDPOINT    = os.environ["MINIO_ENDPOINT"].replace("https://", "").replace("http://", "")
MINIO_ACCESS_KEY  = os.environ["MINIO_ACCESS_KEY"]
MINIO_SECRET_KEY  = os.environ["MINIO_SECRET_KEY"]
MINIO_BUCKET      = os.environ["MINIO_BUCKET"]
VAULT_URL         = os.environ["VAULT_URL"]
VAULT_TOKEN       = os.environ["VAULT_TOKEN"]
VAULT_SKIP_VERIFY = os.environ.get("VAULT_SKIP_VERIFY", "false").lower() == "true"

VAULT_MOUNT = "Domestic"

# ── clients ───────────────────────────────────────────────────────────────────

conn   = psycopg2.connect(DATABASE_URL)
vault  = hvac.Client(url=VAULT_URL, token=VAULT_TOKEN, verify=not VAULT_SKIP_VERIFY)
secure = os.environ["MINIO_ENDPOINT"].startswith("https://")
minio  = Minio(MINIO_ENDPOINT, access_key=MINIO_ACCESS_KEY,
               secret_key=MINIO_SECRET_KEY, secure=secure)

assert vault.is_authenticated(), "Vault token is invalid."
print("Connected to database, MinIO, and Vault.\n")

# ── fetch all evidence that needs rebaselining ────────────────────────────────

with conn.cursor() as cur:
    cur.execute("""
        SELECT e.evidence_id, e.file_name, e.file_path,
               enc.crypto_id, enc.aes_key_reference
        FROM   evidence e
        JOIN   encryption enc ON e.evidence_id = enc.evidence_id
        ORDER  BY e.evidence_id
    """)
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, r)) for r in cur.fetchall()]

print(f"Found {len(rows)} evidence file(s) to inspect.\n")

ok = skipped = errors = 0

for rec in rows:
    eid        = rec["evidence_id"]
    fname      = rec["file_name"]
    fpath      = rec["file_path"]
    cid        = rec["crypto_id"]
    vault_path = rec["aes_key_reference"]

    print(f"[{eid}] {fname}")

    # ── check if hmac_key already exists ─────────────────────────────────────
    try:
        secret = vault.secrets.kv.v2.read_secret_version(
            path=vault_path, mount_point=VAULT_MOUNT, raise_on_deleted_version=True
        )
        data = secret["data"]["data"]
    except Exception as exc:
        print(f"  ERROR reading Vault at '{vault_path}': {exc}")
        errors += 1
        continue

    if "hmac_key" in data:
        print(f"  SKIP — hmac_key already present.")
        skipped += 1
        continue

    # ── download from MinIO ───────────────────────────────────────────────────
    try:
        response  = minio.get_object(MINIO_BUCKET, fpath)
        file_data = response.read()
        response.close()
        response.release_conn()
    except Exception as exc:
        print(f"  ERROR downloading from MinIO ('{fpath}'): {exc}")
        errors += 1
        continue

    # ── generate new HMAC key and hash ────────────────────────────────────────
    hmac_key  = os.urandom(32)
    hmac_hash = hmac.new(hmac_key, file_data, hashlib.sha256).hexdigest()

    # ── store hmac_key in Vault alongside existing AES key ───────────────────
    updated_secret = dict(data)
    updated_secret["hmac_key"] = base64.b64encode(hmac_key).decode("utf-8")

    try:
        vault.secrets.kv.v2.create_or_update_secret(
            path=vault_path,
            secret=updated_secret,
            mount_point=VAULT_MOUNT,
        )
    except Exception as exc:
        print(f"  ERROR writing to Vault: {exc}")
        errors += 1
        continue

    # ── update hmac_hash in database ──────────────────────────────────────────
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE encryption SET hmac_hash=%s, integrity_status='verified', hmac_verified_at=NOW() WHERE crypto_id=%s",
            (hmac_hash, cid),
        )
        conn.commit()

    print(f"  OK — rebaselined. New hash: {hmac_hash[:16]}…")
    ok += 1

conn.close()

print(f"\nDone — Rebaselined: {ok} | Already had key: {skipped} | Errors: {errors}")
if errors:
    print("Files with errors either have a bad Vault path or are missing from MinIO.")
    print("Delete them from the database and re-upload through the app.")
    sys.exit(1)
