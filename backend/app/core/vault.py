import base64

import hvac

from app.config import settings

client = hvac.Client(
    url=settings.VAULT_URL,
    token=settings.VAULT_TOKEN,
    verify=False
)

async def store_key(user_id: int, incident_id: int, file_id: str, aes_key: bytes, hmac_key: bytes) -> str:
    """
    Store both AES key and HMAC key in OpenBao.
    """
    key_path = f"evidence/user_{user_id}/incident_{incident_id}/{file_id}"

    try:
        client.secrets.kv.v2.create_or_update_secret(
            path=key_path,
            secret={
                "aes_key": base64.b64encode(aes_key).decode('utf-8'),
                "hmac_key": base64.b64encode(hmac_key).decode('utf-8')
            },
            mount_point="Domestic"
        )
        return key_path
    except Exception as e:
        raise ValueError(f"Failed to store key in OpenBao: {str(e)}")

async def retrieve_key(user_id: int, incident_id: int, file_id: str) -> bytes:
    """
    Retrieve the AES key from OpenBao.
    """
    key_path = f"evidence/user_{user_id}/incident_{incident_id}/{file_id}"

    try:
        secret = client.secrets.kv.v2.read_secret_version(
            path=key_path,
            mount_point="Domestic"
        )
        key_base64 = secret['data']['data']['aes_key']
        return base64.b64decode(key_base64)
    except Exception as e:
        raise ValueError(f"Failed to retrieve key from OpenBao: {str(e)}")

async def retrieve_key_by_reference(key_reference: str) -> bytes:
    """
    Retrieve the AES key from an OpenBao key reference.
    """
    parts = key_reference.split("/")
    if len(parts) != 4:
        raise ValueError("Invalid OpenBao key reference")

    try:
        user_id = int(parts[1].replace("user_", ""))
        incident_id = int(parts[2].replace("incident_", ""))
    except ValueError as e:
        raise ValueError("Invalid OpenBao key reference") from e

    return await retrieve_key(user_id, incident_id, parts[3])

async def retrieve_hmac_key(user_id: int, incident_id: int, file_id: str) -> bytes:
    """
    Retrieve the HMAC key from OpenBao.
    """
    key_path = f"evidence/user_{user_id}/incident_{incident_id}/{file_id}"

    try:
        secret = client.secrets.kv.v2.read_secret_version(
            path=key_path,
            mount_point="Domestic"
        )
        key_base64 = secret['data']['data']['hmac_key']
        return base64.b64decode(key_base64)
    except Exception as e:
        raise ValueError(f"Failed to retrieve HMAC key from OpenBao: {str(e)}")

async def delete_key(user_id: int, incident_id: int, file_id: str):
    """
    Delete keys from OpenBao.
    """
    key_path = f"evidence/user_{user_id}/incident_{incident_id}/{file_id}"

    try:
        client.secrets.kv.v2.delete_secret_version(
            path=key_path,
            mount_point="Domestic"
        )
    except Exception as e:
        raise ValueError(f"Failed to delete key from OpenBao: {str(e)}")

class VaultKeyStore:
    async def store_key(self, user_id: int, incident_id: int, file_id: str, key_bytes: bytes) -> str:
        key_path = f"evidence/user_{user_id}/incident_{incident_id}/{file_id}"
        try:
            client.secrets.kv.v2.create_or_update_secret(
                path=key_path,
                secret={"aes_key": base64.b64encode(key_bytes).decode('utf-8')},
                mount_point="Domestic"
            )
            return key_path
        except Exception as e:
            raise ValueError(f"Failed to store key in OpenBao: {str(e)}")

    async def retrieve_key_by_reference(self, key_reference: str) -> bytes:
        return await retrieve_key_by_reference(key_reference)

class VaultKeyStore:
    async def store_key(self, user_id: int, incident_id: int, file_id: str, key_bytes: bytes) -> str:
        import os
        key_path = f"evidence/user_{user_id}/incident_{incident_id}/{file_id}"
        try:
            client.secrets.kv.v2.create_or_update_secret(
                path=key_path,
                secret={
                    "aes_key": base64.b64encode(key_bytes).decode('utf-8'),
                    "hmac_key": base64.b64encode(os.urandom(32)).decode('utf-8'),
                },
                mount_point="Domestic"
            )
            return key_path
        except Exception as e:
            raise ValueError(f"Failed to store key in OpenBao: {str(e)}")

    async def retrieve_key_by_reference(self, key_reference: str) -> bytes:
        return await retrieve_key_by_reference(key_reference)
