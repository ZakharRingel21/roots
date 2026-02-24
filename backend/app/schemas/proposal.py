import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.models.proposal import ProposalStatus


class FieldChange(BaseModel):
    before: Any
    after: Any


class ProposalCreate(BaseModel):
    target_person_id: uuid.UUID
    field_changes: dict[str, FieldChange]


class ProposalReview(BaseModel):
    status: ProposalStatus
    comment: str | None = None


class ProposalOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    proposed_by: uuid.UUID
    target_person_id: uuid.UUID
    field_changes: dict[str, Any]
    status: ProposalStatus
    reviewed_by: uuid.UUID | None
    comment: str | None
    created_at: datetime
    reviewed_at: datetime | None
