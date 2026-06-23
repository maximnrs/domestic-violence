from pydantic import BaseModel, EmailStr
from datetime import date
from datetime import time
from datetime import datetime
from app.models.incident import IncidentType

#Users----------------------------------------------
class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    phone_number: str | None = None

class UserResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    email: str
    phone_number: str | None
    account_status: bool
    created_at: date

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

#Cases---------------------------------------------
class CaseCreate(BaseModel):
    case_title: str
    description: str | None = None
    status: str | None = "open"

class CaseUpdate(BaseModel):
    case_title: str | None = None
    description: str | None = None
    status: str | None = None

class CaseResponse(BaseModel):
    case_id: int
    user_id: int
    case_title: str
    description: str | None
    creation_date: date
    status: str | None

    class Config:
        from_attributes = True

#Incidents-----------------------------------------
class IncidentCreate(BaseModel):
    case_id: int
    incident_date: date | None = None
    incident_time: time | None = None
    location: str | None = None
    incident_type: IncidentType | None = None
    description: str | None = None

class IncidentUpdate(BaseModel):
    incident_date: date | None = None
    incident_time: time | None = None
    location: str | None = None
    incident_type: IncidentType | None = None
    description: str | None = None

class IncidentResponse(BaseModel):
    incident_id: int
    case_id: int
    incident_date: date | None
    incident_time: time | None
    location: str | None
    incident_type: IncidentType | None
    description: str | None
    creation_date: date

    class Config:
        from_attributes = True

#evidencetype-------------------------------------
class EvidenceTypeResponse(BaseModel):
    evidence_type_id: int
    type_name: str
    description: str | None

    class Config:
        from_attributes = True

#evidence-----------------------------------------
class EvidenceCreate(BaseModel):
    incident_id: int
    evidence_type_id: int
    evidence_location: str | None = None
    evidence_imei: str | None = None
    evidence_device: str | None = None
    evidence_activation: str | None = None
    description: str | None = None

class EvidenceUpdate(BaseModel):
    evidence_location: str | None = None
    evidence_imei: str | None = None
    evidence_device: str | None = None
    evidence_activation: str | None = None
    description: str | None = None

class EvidenceResponse(BaseModel):
    evidence_id: int
    incident_id: int
    user_id: int
    evidence_type_id: int
    file_name: str
    evidence_location: str | None
    evidence_imei: str | None
    evidence_device: str | None
    evidence_activation: str | None
    file_path: str
    file_hash: str
    timestamp_token: str | None = None
    timestamp_authority: str | None = None
    timestamp_status: str | None = None
    timestamp_hash_algorithm: str | None = None
    timestamp_message_imprint: str | None = None
    timestamp_nonce: str | None = None
    timestamp_time: str | None = None
    created_at: datetime
    description: str | None

    class Config:
        from_attributes = True
