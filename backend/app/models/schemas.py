from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

# ─── Auth ────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    phone_number: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[int] = None

# ─── User ────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    email: str
    phone_number: Optional[str]
    created_at: datetime
    account_status: bool

    class Config:
        from_attributes = True