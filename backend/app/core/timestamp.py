import asyncio
import base64
import hashlib
import secrets
from typing import Any

import requests
from pyasn1.codec.der import decoder, encoder
from pyasn1.type import char, namedtype, tag, univ, useful

from app.config import settings


SHA256_OID = "2.16.840.1.101.3.4.2.1"
CMS_SIGNED_DATA_OID = "1.2.840.113549.1.7.2"
TST_INFO_OID = "1.2.840.113549.1.9.16.1.4"
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


class EncapsulatedContentInfo(univ.Sequence):
    componentType = namedtype.NamedTypes(
        namedtype.NamedType("eContentType", univ.ObjectIdentifier()),
        namedtype.OptionalNamedType(
            "eContent",
            univ.OctetString().subtype(
                explicitTag=tag.Tag(tag.tagClassContext, tag.tagFormatConstructed, 0)
            ),
        ),
    )


class CertificateSet(univ.SetOf):
    componentType = univ.Sequence()


class RevocationInfoChoices(univ.SetOf):
    componentType = univ.Sequence()


class SignerInfos(univ.SetOf):
    componentType = univ.Sequence()


class SignedData(univ.Sequence):
    componentType = namedtype.NamedTypes(
        namedtype.NamedType("version", univ.Integer()),
        namedtype.NamedType("digestAlgorithms", univ.SetOf(componentType=AlgorithmIdentifier())),
        namedtype.NamedType("encapContentInfo", EncapsulatedContentInfo()),
        namedtype.OptionalNamedType(
            "certificates",
            CertificateSet().subtype(
                implicitTag=tag.Tag(tag.tagClassContext, tag.tagFormatConstructed, 0)
            ),
        ),
        namedtype.OptionalNamedType(
            "crls",
            RevocationInfoChoices().subtype(
                implicitTag=tag.Tag(tag.tagClassContext, tag.tagFormatConstructed, 1)
            ),
        ),
        namedtype.NamedType("signerInfos", SignerInfos()),
    )


class TimeStampResp(univ.Sequence):
    componentType = namedtype.NamedTypes(
        namedtype.NamedType("status", PKIStatusInfo()),
        namedtype.OptionalNamedType("timeStampToken", ContentInfo()),
    )


class Accuracy(univ.Sequence):
    componentType = namedtype.NamedTypes(
        namedtype.OptionalNamedType("seconds", univ.Integer()),
        namedtype.OptionalNamedType(
            "millis",
            univ.Integer().subtype(
                implicitTag=tag.Tag(tag.tagClassContext, tag.tagFormatSimple, 0)
            ),
        ),
        namedtype.OptionalNamedType(
            "micros",
            univ.Integer().subtype(
                implicitTag=tag.Tag(tag.tagClassContext, tag.tagFormatSimple, 1)
            ),
        ),
    )


class TSTInfo(univ.Sequence):
    componentType = namedtype.NamedTypes(
        namedtype.NamedType("version", univ.Integer()),
        namedtype.NamedType("policy", univ.ObjectIdentifier()),
        namedtype.NamedType("messageImprint", MessageImprint()),
        namedtype.NamedType("serialNumber", univ.Integer()),
        namedtype.NamedType("genTime", useful.GeneralizedTime()),
        namedtype.OptionalNamedType("accuracy", Accuracy()),
        namedtype.DefaultedNamedType("ordering", univ.Boolean(False)),
        namedtype.OptionalNamedType("nonce", univ.Integer()),
        namedtype.OptionalNamedType(
            "tsa",
            univ.Any().subtype(
                explicitTag=tag.Tag(tag.tagClassContext, tag.tagFormatConstructed, 0)
            ),
        ),
        namedtype.OptionalNamedType(
            "extensions",
            univ.Any().subtype(
                implicitTag=tag.Tag(tag.tagClassContext, tag.tagFormatConstructed, 1)
            ),
        ),
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


def _format_generalized_time(value: useful.GeneralizedTime) -> str:
    timestamp = value.asDateTime
    return timestamp.isoformat().replace("+00:00", "Z")


def _read_der_length(data: bytes, offset: int) -> tuple[int, int]:
    if offset >= len(data):
        raise TimestampAuthorityError("Timestamp token ended while reading DER length")

    first_length_byte = data[offset]
    offset += 1

    if first_length_byte < 0x80:
        return first_length_byte, offset

    length_byte_count = first_length_byte & 0x7F
    if length_byte_count == 0:
        raise TimestampAuthorityError("Timestamp token used unsupported indefinite DER length")
    if offset + length_byte_count > len(data):
        raise TimestampAuthorityError("Timestamp token ended inside DER length")

    length = int.from_bytes(data[offset : offset + length_byte_count], "big")
    return length, offset + length_byte_count


def _read_der_tlv(data: bytes, offset: int) -> tuple[bytes, bytes, int]:
    if offset >= len(data):
        raise TimestampAuthorityError("Timestamp token ended while reading DER tag")

    start = offset
    offset += 1

    if data[start] & 0x1F == 0x1F:
        while offset < len(data):
            current = data[offset]
            offset += 1
            if current & 0x80 == 0:
                break
        else:
            raise TimestampAuthorityError("Timestamp token ended inside high-tag-number DER tag")

    length, value_offset = _read_der_length(data, offset)
    end = value_offset + length
    if end > len(data):
        raise TimestampAuthorityError("Timestamp token DER length exceeds available data")

    return data[start:end], data[value_offset:end], end


def _read_der_sequence_components(data: bytes) -> list[tuple[bytes, bytes]]:
    full_value, sequence_value, offset = _read_der_tlv(data, 0)
    if offset != len(data):
        raise TimestampAuthorityError("Timestamp token sequence contained trailing data")
    if full_value[0] != 0x30:
        raise TimestampAuthorityError("Timestamp token expected a DER sequence")

    components = []
    component_offset = 0
    while component_offset < len(sequence_value):
        full_component, component_value, component_offset = _read_der_tlv(
            sequence_value, component_offset
        )
        components.append((full_component, component_value))

    return components


def _parse_timestamp_token(token: ContentInfo) -> dict[str, Any]:
    content_type = str(token.getComponentByName("contentType"))
    if content_type != CMS_SIGNED_DATA_OID:
        raise TimestampAuthorityError(
            f"Timestamp authority returned unexpected token content type {content_type}"
        )

    signed_data_components = _read_der_sequence_components(
        token.getComponentByName("content").asOctets()
    )
    if len(signed_data_components) < 3:
        raise TimestampAuthorityError("Timestamp token SignedData is incomplete")

    encap_content_components = _read_der_sequence_components(signed_data_components[2][0])
    if len(encap_content_components) < 2:
        raise TimestampAuthorityError("Timestamp token did not contain TSTInfo")

    encap_content_type, remainder = decoder.decode(
        encap_content_components[0][0], asn1Spec=univ.ObjectIdentifier()
    )
    if remainder:
        raise TimestampAuthorityError("Timestamp token content type contained trailing data")
    encap_content_type = str(encap_content_type)
    if encap_content_type != TST_INFO_OID:
        raise TimestampAuthorityError(
            f"Timestamp token contained unexpected evidence content type {encap_content_type}"
        )

    explicit_tst_info = encap_content_components[1]
    if explicit_tst_info[0][0] != 0xA0:
        raise TimestampAuthorityError("Timestamp token did not contain TSTInfo")

    encoded_tst_info, remainder = decoder.decode(
        explicit_tst_info[1], asn1Spec=univ.OctetString()
    )
    if remainder:
        raise TimestampAuthorityError("Timestamp token TSTInfo wrapper contained trailing data")

    tst_info, remainder = decoder.decode(encoded_tst_info.asOctets())
    if remainder:
        raise TimestampAuthorityError("Timestamp token TSTInfo contained malformed trailing data")

    if len(tst_info) < 5:
        raise TimestampAuthorityError("Timestamp token TSTInfo is incomplete")

    token_message_imprint = tst_info.getComponentByPosition(2)
    token_hash_algorithm = str(
        token_message_imprint.getComponentByPosition(0).getComponentByPosition(0)
    )
    nonce = None
    for index in range(5, len(tst_info)):
        component = tst_info.getComponentByPosition(index)
        if component.tagSet == univ.Integer.tagSet:
            nonce = str(component)
            break

    return {
        "time": _format_generalized_time(tst_info.getComponentByPosition(4)),
        "serial_number": str(tst_info.getComponentByPosition(3)),
        "hash_algorithm_oid": token_hash_algorithm,
        "message_imprint": token_message_imprint.getComponentByPosition(1).asOctets().hex(),
        "nonce": nonce,
    }


def extract_timestamp_info_from_token_der(token_der: str) -> dict[str, Any]:
    token_bytes = base64.b64decode(token_der)
    token, remainder = decoder.decode(token_bytes, asn1Spec=ContentInfo())
    if remainder:
        raise TimestampAuthorityError("Timestamp token contained malformed trailing data")
    return _parse_timestamp_token(token)


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

    token_info = _parse_timestamp_token(token)

    return {
        "status": status_name,
        "status_code": status_code,
        "status_messages": status_messages,
        "token": encoder.encode(token),
        "token_info": token_info,
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
    token_info = parsed_response["token_info"]

    if token_info["message_imprint"] != digest.hex():
        raise TimestampAuthorityError("Timestamp token does not match the evidence digest")
    if token_info["nonce"] != str(nonce):
        raise TimestampAuthorityError("Timestamp token does not match the request nonce")

    return {
        "authority": settings.TSA_URL,
        "hash_algorithm": "sha256",
        "message_imprint": digest.hex(),
        "nonce": str(nonce),
        "query_der": base64.b64encode(query_der).decode("ascii"),
        "token_der": base64.b64encode(parsed_response["token"]).decode("ascii"),
        "time": token_info["time"],
        "serial_number": token_info["serial_number"],
        "status": parsed_response["status"],
        "status_code": parsed_response["status_code"],
        "status_messages": parsed_response["status_messages"],
    }
