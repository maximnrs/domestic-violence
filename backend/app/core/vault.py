import base64

import hvac

from app.config import settings


class VaultKeyStore:
    def __init__(
        self,
        url: str | None = None,
        token: str | None = None,
        mount_point: str = "Domestic",
        verify: bool = False,
        client=None,
    ):
        self.url = url or settings.VAULT_URL
        self.token = token or settings.VAULT_TOKEN
        self.mount_point = mount_point
        self.verify = verify
        self._client = client

    @property
    def client(self):
        if self._client is None:
            self._client = hvac.Client(
                url=self.url,
                token=self.token,
                verify=self.verify,
            )
        return self._client

    async def store_key(
        self,
        user_id: int,
        incident_id: int,
        file_id: str,
        key_bytes: bytes,
    ) -> str:
        """
        Store an AES-256 key in OpenBao and return the reference path.
        """
        key_path = f"evidence/user_{user_id}/incident_{incident_id}/{file_id}"

        try:
            self.client.secrets.kv.v2.create_or_update_secret(
                path=key_path,
                secret={"key": base64.b64encode(key_bytes).decode("utf-8")},
                mount_point=self.mount_point,
            )
            return key_path
        except Exception as e:
            raise ValueError(f"Failed to store key in OpenBao: {str(e)}")

    async def retrieve_key(
        self,
        user_id: int,
        incident_id: int,
        file_id: str,
    ) -> bytes:
        """
        Retrieve an AES-256 key from OpenBao.
        """
        key_path = f"evidence/user_{user_id}/incident_{incident_id}/{file_id}"
        return await self.retrieve_key_by_reference(key_path)

    async def retrieve_key_by_reference(self, key_reference: str) -> bytes:
        """
        Retrieve an AES-256 key from OpenBao using a stored key reference path.
        """
        try:
            secret = self.client.secrets.kv.v2.read_secret_version(
                path=key_reference,
                mount_point=self.mount_point,
            )
            key_base64 = secret["data"]["data"]["key"]
            return base64.b64decode(key_base64)
        except Exception as e:
            raise ValueError(f"Failed to retrieve key from OpenBao: {str(e)}")

    async def delete_key(self, user_id: int, incident_id: int, file_id: str):
        """
        Delete a key from OpenBao.
        """
        key_path = f"evidence/user_{user_id}/incident_{incident_id}/{file_id}"

        try:
            self.client.secrets.kv.v2.delete_secret_version(
                path=key_path,
                mount_point=self.mount_point,
            )
        except Exception as e:
            raise ValueError(f"Failed to delete key from OpenBao: {str(e)}")


async def store_key(user_id: int, incident_id: int, file_id: str, key_bytes: bytes) -> str:
    return await VaultKeyStore().store_key(user_id, incident_id, file_id, key_bytes)


async def retrieve_key(user_id: int, incident_id: int, file_id: str) -> bytes:
    return await VaultKeyStore().retrieve_key(user_id, incident_id, file_id)


async def retrieve_key_by_reference(key_reference: str) -> bytes:
    return await VaultKeyStore().retrieve_key_by_reference(key_reference)


async def delete_key(user_id: int, incident_id: int, file_id: str):
    await VaultKeyStore().delete_key(user_id, incident_id, file_id)
