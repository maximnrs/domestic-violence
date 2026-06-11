"""
PATCH for backend/app/services/encryption.py in the API-Server branch.

What changed (line 37):
  Before: await vault.store_key(user_id, incident_id, file_id, aes_key)
  After:  await vault.store_key(user_id, incident_id, file_id, aes_key, hmac_key)

The hmac_key that was already being generated is now passed to vault.store_key
so it gets persisted. Nothing else changed.

Apply together with api-server-fix/vault.py.
"""

import os
import base64
import hmac
import hashlib
import uuid
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from app.core import vault, storage

async def encrypt_file(user_id: int, incident_id: int, file_bytes: bytes) -> dict:
    """
    Encrypt a file with AES-256-GCM and store both keys in OpenBao.
    """
    file_id = str(uuid.uuid4())

    aes_key = os.urandom(32)
    iv = os.urandom(16)

    cipher = Cipher(
        algorithms.AES(aes_key),
        modes.GCM(iv),
        backend=default_backend()
    )
    encryptor = cipher.encryptor()
    encrypted_data = encryptor.update(file_bytes) + encryptor.finalize()

    hmac_key = os.urandom(32)
    h = hmac.new(hmac_key, encrypted_data, hashlib.sha256)
    hmac_hash = h.hexdigest()

    # Store both AES key and HMAC key so integrity can be re-verified later
    key_reference = await vault.store_key(user_id, incident_id, file_id, aes_key, hmac_key)

    file_key = f"evidence/user_{user_id}/incident_{incident_id}/{file_id}.bin"
    file_path = await storage.upload_file(file_key, encrypted_data)

    return {
        "file_path": file_path,
        "key_reference": key_reference,
        "file_id": file_id,
        "iv_nonce": base64.b64encode(iv).decode('utf-8'),
        "hmac_hash": hmac_hash
    }
