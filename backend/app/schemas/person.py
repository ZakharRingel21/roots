import uuid
from datetime import date, datetime

from pydantic import BaseModel

from app.models.person import Gender


class PersonCreate(BaseModel):
    first_name: str
    last_name: str
    patronymic: str | None = None
    maiden_name: str | None = None
    gender: Gender | None = None
    birth_date: date | None = None
    birth_place: str | None = None
    death_date: date | None = None
    death_place: str | None = None
    burial_place: str | None = None
    residence: str | None = None


class PersonUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    patronymic: str | None = None
    maiden_name: str | None = None
    gender: Gender | None = None
    birth_date: date | None = None
    birth_place: str | None = None
    death_date: date | None = None
    death_place: str | None = None
    burial_place: str | None = None
    residence: str | None = None


class PersonOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    tree_id: uuid.UUID
    first_name: str
    last_name: str
    patronymic: str | None
    maiden_name: str | None
    gender: Gender | None
    birth_date: date | None
    birth_place: str | None
    death_date: date | None
    death_place: str | None
    burial_place: str | None
    residence: str | None
    avatar_url: str | None
    avatar_thumb_url: str | None
    created_at: datetime
    updated_at: datetime
