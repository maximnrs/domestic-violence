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
    Encrypt a file with AES-256-GCM and store both the AES key
    and HMAC key in OpenBao.
    """
    # Generate a unique ID for this file
    file_id = str(uuid.uuid4())

    # Generate random AES-256 key (32 bytes) and IV (16 bytes)
    aes_key = os.urandom(32)
    iv = os.urandom(16)

    # Encrypt using AES-256-GCM
    cipher = Cipher(
        algorithms.AES(aes_key),
        modes.GCM(iv),
        backend=default_backend()
    )
    encryptor = cipher.encryptor()
    encrypted_data = encryptor.update(file_bytes) + encryptor.finalize()
    tag = encryptor.tag  # GCM authentication tag (16 bytes)

    # Generate HMAC key and compute HMAC-SHA-256 of encrypted data
    hmac_key = os.urandom(32)
    h = hmac.new(hmac_key, encrypted_data, hashlib.sha256)
    hmac_hash = h.hexdigest()

    # Store both AES key and HMAC key in OpenBao
    key_reference = await vault.store_key(user_id, incident_id, file_id, aes_key, hmac_key)

    # Upload encrypted file + GCM tag to MinIO (tag appended as last 16 bytes)
    file_key = f"evidence/user_{user_id}/incident_{incident_id}/{file_id}.bin"
    file_path = await storage.upload_file(file_key, encrypted_data + tag)

    return {
        "file_path": file_path,
        "key_reference": key_reference,
        "file_id": file_id,
        "iv_nonce": base64.b64encode(iv).decode('utf-8'),
        "hmac_hash": hmac_hash
    }

async def decrypt_file(evidence_id: int, file_path: str, iv_nonce: str) -> bytes:
    """
    Decrypt a file from MinIO using the key from OpenBao.
    """
    # Parse user_id, incident_id, and file_id from the file path
    # path format: evidence/user_{user_id}/incident_{incident_id}/{uuid}.bin
    parts = file_path.split('/')
    user_id = int(parts[1].replace('user_', ''))
    incident_id = int(parts[2].replace('incident_', ''))
    file_id = parts[3].replace('.bin', '')

    # Retrieve encrypted file from MinIO
    encrypted_data_with_tag = await storage.download_file(file_path)

    # Separate encrypted data and GCM tag (tag is always the last 16 bytes)
    encrypted_data = encrypted_data_with_tag[:-16]
    tag = encrypted_data_with_tag[-16:]

    # Retrieve AES key from OpenBao
    aes_key = await vault.retrieve_key(user_id, incident_id, file_id)

    # Decode IV
    iv = base64.b64decode(iv_nonce)

    # Decrypt using AES-256-GCM
    cipher = Cipher(
        algorithms.AES(aes_key),
        modes.GCM(iv, tag),
        backend=default_backend()
    )
    decryptor = cipher.decryptor()
    decrypted_data = decryptor.update(encrypted_data) + decryptor.finalize()

    return decrypted_data