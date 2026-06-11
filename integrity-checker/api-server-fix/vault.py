"""
PATCH for backend/app/core/vault.py in the API-Server branch.

What changed:
- store_key() now accepts and stores both aes_key AND hmac_key in Vault.
  Previously only the AES key was stored, making post-upload HMAC
  verification impossible (the HMAC key was discarded on upload).
- retrieve_key() is backward-compatible: reads "aes_key" field for new
  secrets or the old "key" field for secrets created before this fix.
- retrieve_hmac_key(vault_path) added — used by the integrity checker
  to retrieve the HMAC key for a given evidence file.

How to apply:
  Copy this file to backend/app/core/vault.py in the API-Server and
  also apply api-server-fix/encryption.py.

Note: files uploaded BEFORE this fix have no hmac_key in Vault and will
be marked 'unverifiable' by the integrity checker until re-uploaded.
"""

import hvac
import base64
from app.config import settings

client = hvac.Client(
    url=settings.VAULT_URL,
    token=settings.VAULT_TOKEN,
    verify=False
)

_MOUNT = "Domestic"


async def store_key(
    user_id: int,
    incident_id: int,
    file_id: str,
    aes_key: bytes,
    hmac_key: bytes,
) -> str:
    """Store AES-256 and HMAC-SHA-256 keys in OpenBao. Returns the path."""
    key_path = f"evidence/user_{user_id}/incident_{incident_id}/{file_id}"
    try:
        client.secrets.kv.v2.create_or_update_secret(
            path=key_path,
            secret={
                "aes_key":  base64.b64encode(aes_key).decode("utf-8"),
                "hmac_key": base64.b64encode(hmac_key).decode("utf-8"),
            },
            mount_point=_MOUNT,
        )
        return key_path
    except Exception as e:
        raise ValueError(f"Failed to store key in OpenBao: {e}")


async def retrieve_key(user_id: int, incident_id: int, file_id: str) -> bytes:
    """Retrieve AES key. Handles old ('key') and new ('aes_key') formats."""
    key_path = f"evidence/user_{user_id}/incident_{incident_id}/{file_id}"
    try:
        secret = client.secrets.kv.v2.read_secret_version(
            path=key_path, mount_point=_MOUNT
        )
        data = secret["data"]["data"]
        field = "aes_key" if "aes_key" in data else "key"
        return base64.b64decode(data[field])
    except Exception as e:
        raise ValueError(f"Failed to retrieve key from OpenBao: {e}")


async def retrieve_hmac_key(vault_path: str) -> bytes:
    """Retrieve HMAC key by full path. Used by the integrity checker."""
    try:
        secret = client.secrets.kv.v2.read_secret_version(
            path=vault_path, mount_point=_MOUNT
        )
        data = secret["data"]["data"]
        if "hmac_key" not in data:
            raise ValueError(
                "hmac_key not present — file was uploaded before this fix. Re-upload to enable verification."
            )
        return base64.b64decode(data["hmac_key"])
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Failed to retrieve HMAC key from OpenBao: {e}")


async def delete_key(user_id: int, incident_id: int, file_id: str):
    """Delete a key from OpenBao."""
    key_path = f"evidence/user_{user_id}/incident_{incident_id}/{file_id}"
    try:
        client.secrets.kv.v2.delete_secret_version(
            path=key_path, mount_point=_MOUNT
        )
    except Exception as e:
        raise ValueError(f"Failed to delete key from OpenBao: {e}")
