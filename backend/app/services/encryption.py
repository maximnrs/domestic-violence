import os
import base64
import hmac
import hashlib
import uuid
from app.core import vault, storage

def get_cipher_dependencies():
    from cryptography.hazmat.backends import default_backend
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    return Cipher, algorithms, modes, default_backend

async def encrypt_file(user_id: int, incident_id: int, file_bytes: bytes) -> dict:
    file_id = str(uuid.uuid4())
    aes_key = os.urandom(32)
    hmac_key = os.urandom(32)
    iv = os.urandom(16)

    Cipher, algorithms, modes, default_backend = get_cipher_dependencies()
    cipher = Cipher(algorithms.AES(aes_key), modes.GCM(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(file_bytes) + encryptor.finalize()
    encrypted_data = ciphertext + encryptor.tag

    # HMAC over the encrypted bytes (including GCM tag)
    hmac_hash = hmac.new(hmac_key, encrypted_data, hashlib.sha256).hexdigest()

    # Store both keys in OpenBao
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

async def decrypt_file(evidence_id: int, file_path: str, iv_nonce: str) -> bytes:
    parts = file_path.split('/')
    user_id = int(parts[1].replace('user_', ''))
    incident_id = int(parts[2].replace('incident_', ''))
    file_id = parts[3].replace('.bin', '')

    encrypted_data = await storage.download_file(file_path)
    ciphertext = encrypted_data[:-16]
    tag = encrypted_data[-16:]

    aes_key = await vault.retrieve_key(user_id, incident_id, file_id)
    iv = base64.b64decode(iv_nonce)

    Cipher, algorithms, modes, default_backend = get_cipher_dependencies()
    cipher = Cipher(algorithms.AES(aes_key), modes.GCM(iv, tag), backend=default_backend())
    decryptor = cipher.decryptor()
    return decryptor.update(ciphertext) + decryptor.finalize()
