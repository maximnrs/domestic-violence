from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_BUCKET: str
    VAULT_URL: str
    VAULT_TOKEN: str
    VAULT_SKIP_VERIFY: bool = False
    CHECK_INTERVAL_SECONDS: int = 60

    class Config:
        env_file = ".env"


settings = Settings()
