from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str

    # ── MinIO ─────────────────────────────────────────────────────────────────
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_BUCKET: str

    # ── Vault ─────────────────────────────────────────────────────────────────
    VAULT_URL: str
    VAULT_TOKEN: str
    VAULT_SKIP_VERIFY: bool = False   # set True if using a self-signed certificate
    HMAC_SECRET_PATH: str = "secret/hmac_key"

    class Config:
        env_file = ".env"


settings = Settings()
