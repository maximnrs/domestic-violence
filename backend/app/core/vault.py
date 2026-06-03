import hvac
import base64
from app.config import settings

client = hvac.Client(
    url=settings.VAULT_URL,
    token=settings.VAULT_TOKEN,
    verify=False
)

async def store_key(user_id: int, incident_id: int, file_id: str, key_bytes: bytes) -> str:
    """
    Store an AES-256 key in OpenBao and return the reference path.
    """
    key_path = f"evidence/user_{user_id}/incident_{incident_id}/{file_id}"
    
    try:
        client.secrets.kv.v2.create_or_update_secret(
            path=key_path,
            secret={"key": base64.b64encode(key_bytes).decode('utf-8')},
            mount_point="Domestic"
        )
        return key_path
    except Exception as e:
        raise ValueError(f"Failed to store key in OpenBao: {str(e)}")

async def retrieve_key(user_id: int, incident_id: int, file_id: str) -> bytes:
    """
    Retrieve an AES-256 key from OpenBao.
    """
    key_path = f"evidence/user_{user_id}/incident_{incident_id}/{file_id}"
    
    try:
        secret = client.secrets.kv.v2.read_secret_version(
            path=key_path,
            mount_point="Domestic"
        )
        key_base64 = secret['data']['data']['key']
        return base64.b64decode(key_base64)
    except Exception as e:
        raise ValueError(f"Failed to retrieve key from OpenBao: {str(e)}")

async def retrieve_key_by_reference(key_reference: str) -> bytes:
    """
    Retrieve an AES-256 key from OpenBao using a stored key reference path.
    """
    try:
        secret = client.secrets.kv.v2.read_secret_version(
            path=key_reference,
            mount_point="Domestic"
        )
        key_base64 = secret['data']['data']['key']
        return base64.b64decode(key_base64)
    except Exception as e:
        raise ValueError(f"Failed to retrieve key from OpenBao: {str(e)}")

async def delete_key(user_id: int, incident_id: int, file_id: str):
    """
    Delete a key from OpenBao.
    """
    key_path = f"evidence/user_{user_id}/incident_{incident_id}/{file_id}"
    
    try:
        client.secrets.kv.v2.delete_secret_version(
            path=key_path,
            mount_point="Domestic"
        )
    except Exception as e:
        raise ValueError(f"Failed to delete key from OpenBao: {str(e)}")
