import os
import base64
import hmac
import hashlib
import uuid
from app.core import vault, storage
from app.services.ports import KeyStore, ObjectStorage

def get_cipher_dependencies():
    from cryptography.hazmat.backends import default_backend
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

    return Cipher, algorithms, modes, default_backend

async def encrypt_file(
    user_id: int,
    incident_id: int,
    file_bytes: bytes,
    key_store: KeyStore | None = None,
    object_storage: ObjectStorage | None = None,
) -> dict:
    """
    Encrypt a file with AES-256-GCM and store the key in OpenBao.
    """
    key_store = key_store or vault.VaultKeyStore()
    object_storage = object_storage or storage.S3ObjectStorage()

    # Generate a unique ID for this file
    file_id = str(uuid.uuid4())
    
    # Generate random AES-256 key (32 bytes) and IV (16 bytes)
    aes_key = os.urandom(32)
    iv = os.urandom(16)
    
    # Encrypt using AES-256-GCM
    Cipher, algorithms, modes, default_backend = get_cipher_dependencies()
    cipher = Cipher(
        algorithms.AES(aes_key),
        modes.GCM(iv),
        backend=default_backend()
    )
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(file_bytes) + encryptor.finalize()
    encrypted_data = ciphertext + encryptor.tag
    
    # Compute HMAC-SHA-256 of encrypted data
    hmac_key = os.urandom(32)
    h = hmac.new(hmac_key, encrypted_data, hashlib.sha256)
    hmac_hash = h.hexdigest()
    
    # Store AES key in OpenBao

    key_reference = await key_store.store_key(user_id, incident_id, file_id, aes_key)
    # Upload encrypted file to MinIO with context in path
    file_key = f"evidence/user_{user_id}/incident_{incident_id}/{file_id}.bin"
    file_path = await object_storage.upload_file(file_key, encrypted_data)
    
    return {
        "file_path": file_path,
        "key_reference": key_reference,
        "file_id": file_id,
        "iv_nonce": base64.b64encode(iv).decode('utf-8'),
        "hmac_hash": hmac_hash
    }

async def decrypt_file(
    file_path: str,
    key_reference: str,
    iv_nonce: str,
    key_store: KeyStore | None = None,
    object_storage: ObjectStorage | None = None,
) -> bytes:
    """
    Download and decrypt AES-256-GCM evidence bytes from storage.

    Stored object format for new uploads is ciphertext followed by the 16-byte
    GCM authentication tag.
    """
    key_store = key_store or vault.VaultKeyStore()
    object_storage = object_storage or storage.S3ObjectStorage()

    encrypted_data = await object_storage.download_file(file_path)
    if len(encrypted_data) < 16:
        raise ValueError("Encrypted evidence payload is invalid")

    ciphertext = encrypted_data[:-16]
    tag = encrypted_data[-16:]
    aes_key = await key_store.retrieve_key_by_reference(key_reference)
    iv = base64.b64decode(iv_nonce)

    Cipher, algorithms, modes, default_backend = get_cipher_dependencies()
    cipher = Cipher(
        algorithms.AES(aes_key),
        modes.GCM(iv, tag),
        backend=default_backend()
    )
    decryptor = cipher.decryptor()
    return decryptor.update(ciphertext) + decryptor.finalize()
