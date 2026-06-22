import hashlib
import base64
import struct
import requests
from datetime import datetime, timezone

TSA_URL = "http://timestamp.sectigo.com/rfc3161"

def _build_tsq(file_hash: bytes) -> bytes:
    """
    Build a minimal RFC 3161 TimeStampReq in DER encoding.
    Structure:
      SEQUENCE {
        INTEGER 1                    -- version
        MessageImprint {
          AlgorithmIdentifier SHA-256
          BIT STRING hash
        }
        BOOLEAN TRUE                 -- certReq
      }
    """
    # SHA-256 AlgorithmIdentifier OID: 2.16.840.1.101.3.4.2.1
    sha256_oid = bytes([
        0x30, 0x0d,
        0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01,
        0x05, 0x00
    ])
    hash_bitstring = b'\x04' + bytes([len(file_hash)]) + file_hash
    message_imprint = b'\x30' + bytes([len(sha256_oid) + len(hash_bitstring)]) + sha256_oid + hash_bitstring

    version = b'\x02\x01\x01'
    cert_req = b'\x01\x01\xff'

    inner = version + message_imprint + cert_req
    tsq = b'\x30' + bytes([len(inner)]) + inner
    return tsq


async def request_timestamp(file_bytes: bytes) -> dict:
    """
    Request a cryptographic RFC 3161 timestamp from Sectigo TSA.
    Proves the file existed at a specific point in time.

    Args:
        file_bytes: The raw file bytes to timestamp (the encrypted evidence file)

    Returns:
        Dictionary with all timestamp fields ready to save to the database
    """
    try:
        # Hash the file
        file_hash = hashlib.sha256(file_bytes).digest()
        hash_hex = file_hash.hex()

        # Build and send the TSQ
        tsq = _build_tsq(file_hash)
        response = requests.post(
            TSA_URL,
            data=tsq,
            headers={"Content-Type": "application/timestamp-query"},
            timeout=10
        )

        if response.status_code != 200:
            raise ValueError(f"TSA returned HTTP {response.status_code}")

        tsr_bytes = response.content
        if not tsr_bytes:
            raise ValueError("TSA returned empty response")

        # Store the full token as base64 for later verification
        token_b64 = base64.b64encode(tsr_bytes).decode("utf-8")

        return {
            "timestamp_token": token_b64,
            "timestamp_authority": TSA_URL,
            "timestamp_status": "granted",
            "timestamp_hash_algorithm": "SHA-256",
            "timestamp_message_imprint": hash_hex,
            "timestamp_nonce": None,
            "timestamp_time": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        # Do not fail the upload if timestamping fails — log it and return a failed status
        return {
            "timestamp_token": None,
            "timestamp_authority": TSA_URL,
            "timestamp_status": f"failed: {str(e)}",
            "timestamp_hash_algorithm": "SHA-256",
            "timestamp_message_imprint": None,
            "timestamp_nonce": None,
            "timestamp_time": datetime.now(timezone.utc).isoformat(),
        }