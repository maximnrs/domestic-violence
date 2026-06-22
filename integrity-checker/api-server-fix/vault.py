"""
PATCH for backend/app/core/vault.py in the API-Server branch.

What changed:
- store_key() now accepts hmac_key as a 5th argument and stores both
  {"aes_key": ..., "hmac_key": ...} so integrity can be re-verified later.
- retrieve_key_by_reference() unchanged in behaviour — kept for decrypt_file.
- retrieve_hmac_key() added — used by the integrity checker to fetch the
  HMAC key for a given evidence file.
- retrieve_key() backward-compatible with old secrets that only have "key".

How to apply:
  Copy this file to backend/app/core/vault.py in the API-Server and also
  apply api-server-fix/encryption.py. Restart the API-Server container.

Note: files uploaded BEFORE this fix are missing hmac_key in Vault and
will show as 'unverifiable'. Run api-server-fix/rebaseline.py to fix them.
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
    """Store AES-256 and HMAC-SHA-256 keys. Returns the Vault path."""
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
    """Retrieve AES key by user/incident/file IDs. Handles old and new formats."""
    key_path = f"evidence/user_{user_id}/incident_{incident_id}/{file_id}"
    return await retrieve_key_by_reference(key_path)


async def retrieve_key_by_reference(key_reference: str) -> bytes:
    """Retrieve AES key by full Vault path (used by decrypt_file)."""
    try:
        secret = client.secrets.kv.v2.read_secret_version(
            path=key_reference, mount_point=_MOUNT
        )
        data = secret["data"]["data"]
        # Support old format ("key") and new format ("aes_key")
        field = "aes_key" if "aes_key" in data else "key"
        return base64.b64decode(data[field])
    except Exception as e:
        raise ValueError(f"Failed to retrieve key from OpenBao: {e}")


async def retrieve_hmac_key(vault_path: str) -> bytes:
    """Retrieve HMAC key by full Vault path (used by the integrity checker)."""
    try:
        secret = client.secrets.kv.v2.read_secret_version(
            path=vault_path, mount_point=_MOUNT
        )
        data = secret["data"]["data"]
        if "hmac_key" not in data:
            raise ValueError(
                "hmac_key not present — file was uploaded before the fix. "
                "Run api-server-fix/rebaseline.py to add keys for existing files."
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
