from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, 
    Boolean, ForeignKey, Date, Time
)
from sqlalchemy.orm import relationship
from app.services.database import Base

class AppUser(Base):
    __tablename__ = "app_user"

    user_id         = Column(Integer, primary_key=True, index=True)
    first_name      = Column(String)
    last_name       = Column(String)
    email           = Column(String, unique=True, index=True)
    password_hash   = Column(String)
    phone_number    = Column(String)
    created_at      = Column(DateTime, default=datetime.utcnow)
    account_status  = Column(Boolean, default=True)

    cases           = relationship("Case", back_populates="user")
    audit_logs      = relationship("AuditLog", back_populates="user")


class Case(Base):
    __tablename__ = "cases"

    case_id         = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("app_user.user_id"))
    case_title      = Column(String)
    description     = Column(Text)
    creation_date   = Column(DateTime, default=datetime.utcnow)
    status          = Column(String)

    user            = relationship("AppUser", back_populates="cases")
    incidents       = relationship("Incident", back_populates="case")
    export_packages = relationship("ExportPackage", back_populates="case")


class Incident(Base):
    __tablename__ = "incident"

    incident_id     = Column(Integer, primary_key=True, index=True)
    case_id         = Column(Integer, ForeignKey("cases.case_id"))
    incident_date   = Column(Date)
    incident_time   = Column(Time)
    location        = Column(String)
    incident_type   = Column(String)
    description     = Column(Text)
    creation_date   = Column(DateTime, default=datetime.utcnow)

    case            = relationship("Case", back_populates="incidents")
    evidence        = relationship("Evidence", back_populates="incident")


class EvidenceType(Base):
    __tablename__ = "evidencetype"

    evidence_type_id = Column(Integer, primary_key=True, index=True)
    type_name        = Column(String)
    description      = Column(Text)

    evidence         = relationship("Evidence", back_populates="evidence_type")


class Evidence(Base):
    __tablename__ = "evidence"

    evidence_id         = Column(Integer, primary_key=True, index=True)
    incident_id         = Column(Integer, ForeignKey("incident.incident_id"))
    user_id             = Column(Integer, ForeignKey("app_user.user_id"))
    evidence_type_id    = Column(Integer, ForeignKey("evidencetype.evidence_type_id"))
    file_name           = Column(String)
    evidence_location   = Column(String)
    evidence_imei       = Column(String)
    evidence_device     = Column(String)
    evidence_activation = Column(String)
    file_path           = Column(String)
    file_hash           = Column(String)
    created_at          = Column(DateTime, default=datetime.utcnow)
    description         = Column(Text)

    incident            = relationship("Incident", back_populates="evidence")
    evidence_type       = relationship("EvidenceType", back_populates="evidence")
    encryption          = relationship("Encryption", back_populates="evidence", uselist=False)
    audit_logs          = relationship("AuditLog", back_populates="evidence")


class Encryption(Base):
    __tablename__ = "encryption"

    crypto_id           = Column(Integer, primary_key=True, index=True)
    evidence_id         = Column(Integer, ForeignKey("evidence.evidence_id"))
    aes_key_reference   = Column(String)  # reference to key stored in OpenBao
    iv_nonce            = Column(String)
    hmac_hash           = Column(String)
    hmac_verified_at    = Column(DateTime)
    integrity_status    = Column(String)
    downloaded_at       = Column(DateTime)
    description         = Column(Text)

    evidence            = relationship("Evidence", back_populates="encryption")


class AuditLog(Base):
    __tablename__ = "auditlog"

    audit_log_id        = Column(Integer, primary_key=True, index=True)
    user_id             = Column(Integer, ForeignKey("app_user.user_id"))
    case_id             = Column(Integer, ForeignKey("cases.case_id"))
    incident_id         = Column(Integer, ForeignKey("incident.incident_id"))
    evidence_id         = Column(Integer, ForeignKey("evidence.evidence_id"))
    export_id           = Column(Integer, ForeignKey("export_package.export_id"))
    action_type         = Column(String)
    entity_type         = Column(String)
    entity_id           = Column(Integer)
    action_timestamp    = Column(DateTime, default=datetime.utcnow)
    old_value           = Column(Text)
    new_value           = Column(Text)

    user                = relationship("AppUser", back_populates="audit_logs")
    evidence            = relationship("Evidence", back_populates="audit_logs")


class ExportPackage(Base):
    __tablename__ = "export_package"

    export_id           = Column(Integer, primary_key=True, index=True)
    case_id             = Column(Integer, ForeignKey("cases.case_id"))
    user_id             = Column(Integer, ForeignKey("app_user.user_id"))
    created_by          = Column(String)
    created_at          = Column(DateTime, default=datetime.utcnow)
    export_format       = Column(String)
    destination_type    = Column(String)
    note                = Column(Text)

    case                = relationship("Case", back_populates="export_packages")