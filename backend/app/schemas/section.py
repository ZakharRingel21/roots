import uuid

from pydantic import BaseModel


class SectionCreate(BaseModel):
    title: str
    content_html: str
    sort_order: int = 0


class SectionUpdate(BaseModel):
    title: str | None = None
    content_html: str | None = None
    sort_order: int | None = None


class SectionOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    person_id: uuid.UUID
    title: str
    content_html: str
    sort_order: int
