import asyncio
import base64
import hashlib
import secrets
from typing import Any

import requests
from pyasn1.codec.der import decoder, encoder
from pyasn1.type import char, namedtype, tag, univ

from app.config import settings


SHA256_OID = "2.16.840.1.101.3.4.2.1"
CONTENT_TYPE_TIMESTAMP_QUERY = "application/timestamp-query"
CONTENT_TYPE_TIMESTAMP_REPLY = "application/timestamp-reply"
GRANTED_STATUSES = {0: "granted", 1: "granted_with_mods"}
FAILURE_STATUSES = {
    2: "rejection",
    3: "waiting",
    4: "revocation_warning",
    5: "revocation_notification",
}


class TimestampAuthorityError(ValueError):
    """Raised when an RFC 3161 timestamp cannot be obtained."""


class AlgorithmIdentifier(univ.Sequence):
    componentType = namedtype.NamedTypes(
        namedtype.NamedType("algorithm", univ.ObjectIdentifier()),
        namedtype.OptionalNamedType("parameters", univ.Any()),
    )


class MessageImprint(univ.Sequence):
    componentType = namedtype.NamedTypes(
        namedtype.NamedType("hashAlgorithm", AlgorithmIdentifier()),
        namedtype.NamedType("hashedMessage", univ.OctetString()),
    )


class TimeStampReq(univ.Sequence):
    componentType = namedtype.NamedTypes(
        namedtype.NamedType("version", univ.Integer()),
        namedtype.NamedType("messageImprint", MessageImprint()),
        namedtype.OptionalNamedType("reqPolicy", univ.ObjectIdentifier()),
        namedtype.OptionalNamedType("nonce", univ.Integer()),
        namedtype.DefaultedNamedType("certReq", univ.Boolean(False)),
    )


class PKIFreeText(univ.SequenceOf):
    componentType = char.UTF8String()


class PKIStatusInfo(univ.Sequence):
    componentType = namedtype.NamedTypes(
        namedtype.NamedType("status", univ.Integer()),
        namedtype.OptionalNamedType("statusString", PKIFreeText()),
        namedtype.OptionalNamedType("failInfo", univ.BitString()),
    )


class ContentInfo(univ.Sequence):
    componentType = namedtype.NamedTypes(
        namedtype.NamedType("contentType", univ.ObjectIdentifier()),
        namedtype.NamedType(
            "content",
            univ.Any().subtype(
                explicitTag=tag.Tag(tag.tagClassContext, tag.tagFormatConstructed, 0)
            ),
        ),
    )


class TimeStampResp(univ.Sequence):
    componentType = namedtype.NamedTypes(
        namedtype.NamedType("status", PKIStatusInfo()),
        namedtype.OptionalNamedType("timeStampToken", ContentInfo()),
    )


def _build_timestamp_query(digest: bytes, nonce: int) -> bytes:
    request = TimeStampReq()
    request.setComponentByName("version", 1)

    hash_algorithm = AlgorithmIdentifier()
    hash_algorithm.setComponentByName("algorithm", univ.ObjectIdentifier(SHA256_OID))
    hash_algorithm.setComponentByName("parameters", encoder.encode(univ.Null("")))

    imprint = MessageImprint()
    imprint.setComponentByName("hashAlgorithm", hash_algorithm)
    imprint.setComponentByName("hashedMessage", digest)

    request.setComponentByName("messageImprint", imprint)
    request.setComponentByName("nonce", nonce)
    request.setComponentByName("certReq", True)

    return encoder.encode(request)


def _status_strings(status_info: PKIStatusInfo) -> list[str]:
    status_string = status_info.getComponentByName("statusString")
    if not status_string.isValue:
        return []
    return [str(item) for item in status_string]


def _parse_timestamp_response(response_bytes: bytes) -> dict[str, Any]:
    timestamp_response, remainder = decoder.decode(response_bytes, asn1Spec=TimeStampResp())
    if remainder:
        raise TimestampAuthorityError("Timestamp authority returned malformed trailing data")

    status_info = timestamp_response.getComponentByName("status")
    status_code = int(status_info.getComponentByName("status"))
    status_name = GRANTED_STATUSES.get(status_code) or FAILURE_STATUSES.get(
        status_code, f"unknown_{status_code}"
    )
    status_messages = _status_strings(status_info)

    if status_code not in GRANTED_STATUSES:
        detail = f": {'; '.join(status_messages)}" if status_messages else ""
        raise TimestampAuthorityError(
            f"Timestamp authority did not grant a timestamp ({status_name}){detail}"
        )

    token = timestamp_response.getComponentByName("timeStampToken")
    if not token.isValue:
        raise TimestampAuthorityError("Timestamp authority granted a response without a token")

    return {
        "status": status_name,
        "status_code": status_code,
        "status_messages": status_messages,
        "token": encoder.encode(token),
    }


def _request_timestamp_sync(query_der: bytes) -> bytes:
    try:
        response = requests.post(
            settings.TSA_URL,
            data=query_der,
            headers={
                "Content-Type": CONTENT_TYPE_TIMESTAMP_QUERY,
                "Accept": CONTENT_TYPE_TIMESTAMP_REPLY,
            },
            timeout=settings.TSA_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except requests.Timeout as error:
        raise TimestampAuthorityError("Timestamp authority request timed out") from error
    except requests.ConnectionError as error:
        raise TimestampAuthorityError("Timestamp authority is not reachable") from error
    except requests.RequestException as error:
        raise TimestampAuthorityError(f"Timestamp authority request failed: {error}") from error

    return response.content


async def request_timestamp(file_bytes: bytes) -> dict:
    """
    Request an RFC 3161 timestamp token for the evidence bytes.

    The TSA signs the SHA-256 message imprint. No local clock value is used as
    proof of existence; uploads fail if the trusted timestamp cannot be issued.
    """
    digest = hashlib.sha256(file_bytes).digest()
    nonce = secrets.randbits(128)
    query_der = _build_timestamp_query(digest, nonce)
    response_der = await asyncio.to_thread(_request_timestamp_sync, query_der)
    parsed_response = _parse_timestamp_response(response_der)

    return {
        "authority": settings.TSA_URL,
        "hash_algorithm": "sha256",
        "message_imprint": digest.hex(),
        "nonce": str(nonce),
        "query_der": base64.b64encode(query_der).decode("ascii"),
        "token_der": base64.b64encode(parsed_response["token"]).decode("ascii"),
        "status": parsed_response["status"],
        "status_code": parsed_response["status_code"],
        "status_messages": parsed_response["status_messages"],
    }
