from pydantic import BaseModel, EmailStr
from datetime import date

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