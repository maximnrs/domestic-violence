from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_BUCKET: str
    VAULT_URL: str
    VAULT_TOKEN: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    TSA_URL: str = "http://timestamp.sectigo.com/rfc3161"
    TSA_TIMEOUT_SECONDS: float = 10.0

    class Config:
        env_file = "../.env"

settings = Settings()
