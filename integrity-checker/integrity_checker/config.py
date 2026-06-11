import os

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL: str = os.environ["DATABASE_URL"]

# ── MinIO ─────────────────────────────────────────────────────────────────────
MINIO_ENDPOINT: str   = os.environ["MINIO_ENDPOINT"]
MINIO_ACCESS_KEY: str = os.environ["MINIO_ACCESS_KEY"]
MINIO_SECRET_KEY: str = os.environ["MINIO_SECRET_KEY"]
MINIO_BUCKET: str     = os.environ["MINIO_BUCKET"]

# ── OpenBao / Vault ───────────────────────────────────────────────────────────
OPENBAO_ADDR: str     = os.environ["OPENBAO_ADDR"]
OPENBAO_TOKEN: str    = os.environ["OPENBAO_TOKEN"]
HMAC_SECRET_PATH: str = os.environ["HMAC_SECRET_PATH"]

# ── Checker ───────────────────────────────────────────────────────────────────
CHECK_INTERVAL_SECONDS: int = int(os.environ.get("CHECK_INTERVAL_SECONDS", 60))
