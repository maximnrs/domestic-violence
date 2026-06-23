import base64
import hashlib
from datetime import datetime, timezone

import requests
from pyasn1.codec.der import decoder
from pyasn1.type import namedtype, tag, univ, useful

TSA_URL = "http://timestamp.sectigo.com/rfc3161"
SHA256_OID = "2.16.840.1.101.3.4.2.1"
CMS_SIGNED_DATA_OID = "1.2.840.113549.1.7.2"
TST_INFO_OID = "1.2.840.113549.1.9.16.1.4"


class TimestampAuthorityError(RuntimeError):
    """Raised when a trusted timestamp cannot be obtained or parsed."""


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


class TSTInfo(univ.Sequence):
    componentType = namedtype.NamedTypes(
        namedtype.NamedType("version", univ.Integer()),
        namedtype.NamedType("policy", univ.ObjectIdentifier()),
        namedtype.NamedType("messageImprint", MessageImprint()),
        namedtype.NamedType("serialNumber", univ.Integer()),
        namedtype.NamedType("genTime", useful.GeneralizedTime()),
        namedtype.OptionalNamedType("nonce", univ.Integer()),
    )


class EncapsulatedContentInfo(univ.Sequence):
    componentType = namedtype.NamedTypes(
        namedtype.NamedType("eContentType", univ.ObjectIdentifier()),
        namedtype.OptionalNamedType("eContent", univ.Any()),
    )


class CmsEncapsulatedContentInfo(univ.Sequence):
    componentType = namedtype.NamedTypes(
        namedtype.NamedType("eContentType", univ.ObjectIdentifier()),
        namedtype.OptionalNamedType(
            "eContent",
            univ.OctetString().subtype(
                explicitTag=tag.Tag(tag.tagClassContext, tag.tagFormatConstructed, 0)
            ),
        ),
    )


class SignerInfos(univ.SetOf):
    componentType = univ.Any()


class CertificateSet(univ.SetOf):
    componentType = univ.Any()


class RevocationInfoChoices(univ.SetOf):
    componentType = univ.Any()


class SignedData(univ.Sequence):
    componentType = namedtype.NamedTypes(
        namedtype.NamedType("version", univ.Integer()),
        namedtype.NamedType(
            "digestAlgorithms",
            univ.SetOf(componentType=AlgorithmIdentifier()),
        ),
        namedtype.NamedType("encapContentInfo", EncapsulatedContentInfo()),
        namedtype.NamedType("signerInfos", SignerInfos()),
    )


class CmsSignedData(univ.Sequence):
    componentType = namedtype.NamedTypes(
        namedtype.NamedType("version", univ.Integer()),
        namedtype.NamedType(
            "digestAlgorithms",
            univ.SetOf(componentType=AlgorithmIdentifier()),
        ),
        namedtype.NamedType("encapContentInfo", CmsEncapsulatedContentInfo()),
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


class ContentInfo(univ.Sequence):
    componentType = namedtype.NamedTypes(
        namedtype.NamedType("contentType", univ.ObjectIdentifier()),
        namedtype.NamedType("content", univ.Any()),
    )


class PKIStatusInfo(univ.Sequence):
    componentType = namedtype.NamedTypes(
        namedtype.NamedType("status", univ.Integer()),
    )


class TimeStampResp(univ.Sequence):
    componentType = namedtype.NamedTypes(
        namedtype.NamedType("status", PKIStatusInfo()),
        namedtype.OptionalNamedType("timeStampToken", ContentInfo()),
    )

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
        # Build and send the TSQ
        tsq = _build_tsq(file_hash)
        response = requests.post(
            TSA_URL,
            data=tsq,
            headers={"Content-Type": "application/timestamp-query"},
            timeout=10
        )

        if response.status_code != 200:
            raise TimestampAuthorityError(f"TSA returned HTTP {response.status_code}")

        tsr_bytes = response.content
        if not tsr_bytes:
            raise TimestampAuthorityError("TSA returned empty response")

        parsed_response = _parse_timestamp_response(tsr_bytes)
        token_info = parsed_response["token_info"]

        return {
            "authority": TSA_URL,
            "hash_algorithm": "SHA-256",
            "message_imprint": token_info["message_imprint"],
            "nonce": token_info["nonce"],
            "token_der": base64.b64encode(tsr_bytes).decode("utf-8"),
            "status": parsed_response["status"],
            "time": token_info["time"],
        }

    except TimestampAuthorityError:
        raise
    except Exception as error:
        raise TimestampAuthorityError(f"Timestamp authority request failed: {error}") from error


def _format_generalized_time(value: useful.GeneralizedTime) -> str:
    raw_value = str(value)
    parsed_time = datetime.strptime(raw_value, "%Y%m%d%H%M%SZ").replace(tzinfo=timezone.utc)
    return parsed_time.isoformat().replace("+00:00", "Z")


def _decode_signed_data(content: univ.Any):
    content_bytes = bytes(content)
    try:
        return decoder.decode(
            content_bytes,
            asn1Spec=CmsSignedData().subtype(
                explicitTag=tag.Tag(tag.tagClassContext, tag.tagFormatConstructed, 0)
            ),
        )
    except Exception:
        return decoder.decode(content_bytes, asn1Spec=SignedData())


def _decode_tst_info(econtent) -> tuple[useful.GeneralizedTime, str, str | None]:
    econtent_bytes = bytes(econtent)
    try:
        tst_info, rest = decoder.decode(econtent_bytes, asn1Spec=TSTInfo())
        if rest:
            raise ValueError("Unexpected trailing data in TSTInfo")

        imprint = tst_info["messageImprint"]
        hash_algorithm = str(imprint["hashAlgorithm"]["algorithm"])
        if hash_algorithm != SHA256_OID:
            raise ValueError(f"Unsupported timestamp hash algorithm: {hash_algorithm}")

        nonce = tst_info["nonce"]
        return (
            tst_info["genTime"],
            bytes(imprint["hashedMessage"]).hex(),
            str(int(nonce)) if nonce.hasValue() else None,
        )
    except Exception:
        tst_info, rest = decoder.decode(econtent_bytes)
        if rest:
            raise ValueError("Unexpected trailing data in TSTInfo")
        if len(tst_info) < 5:
            raise ValueError("Timestamp token TSTInfo is incomplete")

        imprint = tst_info.getComponentByPosition(2)
        hash_algorithm = str(imprint.getComponentByPosition(0).getComponentByPosition(0))
        if hash_algorithm != SHA256_OID:
            raise ValueError(f"Unsupported timestamp hash algorithm: {hash_algorithm}")

        nonce = None
        for index in range(5, len(tst_info)):
            component = tst_info.getComponentByPosition(index)
            if component.tagSet == univ.Integer.tagSet:
                nonce = str(int(component))
                break

        return (
            tst_info.getComponentByPosition(4),
            bytes(imprint.getComponentByPosition(1)).hex(),
            nonce,
        )


def _parse_timestamp_response(response_der: bytes) -> dict:
    try:
        response, rest = decoder.decode(response_der, asn1Spec=TimeStampResp())
        if rest:
            raise ValueError("Unexpected trailing data in timestamp response")

        status_code = int(response["status"]["status"])
        if status_code != 0:
            raise ValueError(f"TSA did not grant timestamp request: status {status_code}")

        token = response["timeStampToken"]
        signed_data, rest = _decode_signed_data(token["content"])
        if rest:
            raise ValueError("Unexpected trailing data in signed timestamp token")

        encap_content = signed_data["encapContentInfo"]
        if str(encap_content["eContentType"]) != TST_INFO_OID:
            raise ValueError("Timestamp token does not contain TSTInfo")

        gen_time, message_imprint, nonce = _decode_tst_info(encap_content["eContent"])

        return {
            "status": "granted",
            "token_info": {
                "time": _format_generalized_time(gen_time),
                "message_imprint": message_imprint,
                "nonce": nonce,
            },
        }
    except Exception as error:
        if isinstance(error, TimestampAuthorityError):
            raise
        raise TimestampAuthorityError(f"Unable to parse timestamp response: {error}") from error


def extract_timestamp_info_from_token_der(token_der: str) -> dict:
    try:
        return _parse_timestamp_response(base64.b64decode(token_der))["token_info"]
    except Exception as error:
        raise ValueError(f"Unable to extract timestamp info: {error}") from error
