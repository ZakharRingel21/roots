import uuid
from datetime import datetime

from pydantic import BaseModel


class PhotoOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    person_id: uuid.UUID
    file_url: str
    caption: str | None
    sort_order: int
    uploaded_at: datetime


class PhotoUpdate(BaseModel):
    caption: str | None = None
    sort_order: int | None = None


class DocumentOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    person_id: uuid.UUID
    file_url: str
    file_name: str
    file_type: str
    uploaded_at: datetime
