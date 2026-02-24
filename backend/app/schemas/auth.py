import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole, UserStatus


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    email: str
    role: UserRole
    status: UserStatus
    person_id: uuid.UUID | None
    oauth_provider: str | None
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
