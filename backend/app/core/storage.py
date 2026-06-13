import boto3
from botocore.exceptions import ClientError

from app.config import settings


class S3ObjectStorage:
    def __init__(
        self,
        endpoint_url: str | None = None,
        access_key: str | None = None,
        secret_key: str | None = None,
        bucket: str | None = None,
        region_name: str = "us-east-1",
        client=None,
    ):
        self.endpoint_url = endpoint_url or settings.MINIO_ENDPOINT
        self.access_key = access_key or settings.MINIO_ACCESS_KEY
        self.secret_key = secret_key or settings.MINIO_SECRET_KEY
        self.bucket = bucket or settings.MINIO_BUCKET
        self.region_name = region_name
        self._client = client

    @property
    def client(self):
        if self._client is None:
            self._client = boto3.client(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region_name,
            )
        return self._client

    async def upload_file(self, file_key: str, file_bytes: bytes) -> str:
        """
        Upload encrypted file to MinIO.
        """
        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=file_key,
                Body=file_bytes,
            )
            return file_key
        except ClientError as e:
            raise ValueError(f"Failed to upload file to MinIO: {str(e)}")

    async def download_file(self, file_key: str) -> bytes:
        """
        Download encrypted file from MinIO.
        """
        try:
            response = self.client.get_object(
                Bucket=self.bucket,
                Key=file_key,
            )
            return response["Body"].read()
        except ClientError as e:
            raise ValueError(f"Failed to download file from MinIO: {str(e)}")

    async def delete_file(self, file_key: str):
        """
        Delete file from MinIO.
        """
        try:
            self.client.delete_object(
                Bucket=self.bucket,
                Key=file_key,
            )
        except ClientError as e:
            raise ValueError(f"Failed to delete file from MinIO: {str(e)}")


async def upload_file(file_key: str, file_bytes: bytes) -> str:
    """
    Upload encrypted file to MinIO.

    Args:
        file_key: Path/key in MinIO (e.g., 'evidence/user_12/file_123.bin')
        file_bytes: The encrypted file bytes

    Returns:
        The full file path/key
    """
    return await S3ObjectStorage().upload_file(file_key, file_bytes)


async def download_file(file_key: str) -> bytes:
    """
    Download encrypted file from MinIO.

    Args:
        file_key: Path/key in MinIO

    Returns:
        The file bytes
    """
    return await S3ObjectStorage().download_file(file_key)


async def delete_file(file_key: str):
    """
    Delete file from MinIO.

    Args:
        file_key: Path/key in MinIO
    """
    await S3ObjectStorage().delete_file(file_key)
