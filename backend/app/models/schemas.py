from pydantic import BaseModel, EmailStr
from datetime import date
from datetime import time
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