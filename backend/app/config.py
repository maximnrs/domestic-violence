from pydantic_settings import BaseSettings

class Settings(BaseSettings):

    #database
    database_url: str

    #MinIO (Truenas)
    minio_endpoint: str
    minio_access_key: str
    minio_secret_key: str
    minio_bucket: str

    #OpenBao (Vault)
    vault_url: str
    vault_token: str

    #JWT Auth
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30


    class Config:
        env_file = "../.env"

settings = Settings()