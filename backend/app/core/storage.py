import boto3
from botocore.exceptions import ClientError
from app.config import settings
from io import BytesIO

# Initialize MinIO client (S3 compatible)
s3_client = boto3.client(
    's3',
    endpoint_url=settings.MINIO_ENDPOINT,
    aws_access_key_id=settings.MINIO_ACCESS_KEY,
    aws_secret_access_key=settings.MINIO_SECRET_KEY,
    region_name='us-east-1'
)

async def upload_file(file_key: str, file_bytes: bytes) -> str:
    """
    Upload encrypted file to MinIO.
    
    Args:
        file_key: Path/key in MinIO (e.g., 'evidence/user_12/file_123.bin')
        file_bytes: The encrypted file bytes
    
    Returns:
        The full file path/key
    """
    try:
        s3_client.put_object(
            Bucket=settings.MINIO_BUCKET,
            Key=file_key,
            Body=file_bytes
        )
        return file_key
    except ClientError as e:
        raise ValueError(f"Failed to upload file to MinIO: {str(e)}")

async def download_file(file_key: str) -> bytes:
    """
    Download encrypted file from MinIO.
    
    Args:
        file_key: Path/key in MinIO
    
    Returns:
        The file bytes
    """
    try:
        response = s3_client.get_object(
            Bucket=settings.MINIO_BUCKET,
            Key=file_key
        )
        return response['Body'].read()
    except ClientError as e:
        raise ValueError(f"Failed to download file from MinIO: {str(e)}")

async def delete_file(file_key: str):
    """
    Delete file from MinIO (use with caution).
    
    Args:
        file_key: Path/key in MinIO
    """
    try:
        s3_client.delete_object(
            Bucket=settings.MINIO_BUCKET,
            Key=file_key
        )
    except ClientError as e:
        raise ValueError(f"Failed to delete file from MinIO: {str(e)}")