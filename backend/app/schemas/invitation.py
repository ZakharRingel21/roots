import uuid
from datetime import datetime

from pydantic import BaseModel


class InvitationCreate(BaseModel):
    target_person_id: uuid.UUID | None = None
    expires_hours: int = 72
    max_uses: int = 1


class InvitationOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    token: str
    created_by: uuid.UUID
    target_person_id: uuid.UUID | None
    expires_at: datetime
    max_uses: int
    used_count: int


class InvitationValidate(BaseModel):
    valid: bool
    target_person_id: uuid.UUID | None
    message: str | None = None
