import uuid
from datetime import date

from pydantic import BaseModel

from app.models.relationship import RelationshipType


class RelationshipCreate(BaseModel):
    person_id: uuid.UUID
    related_person_id: uuid.UUID
    relationship_type: RelationshipType
    tree_id: uuid.UUID


class RelationshipOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    tree_id: uuid.UUID
    person_id: uuid.UUID
    related_person_id: uuid.UUID
    relationship_type: RelationshipType


class PersonInRelationship(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    first_name: str
    last_name: str
    patronymic: str | None
    birth_date: date | None
    death_date: date | None
    avatar_thumb_url: str | None


class RelationshipWithPersonOut(RelationshipOut):
    related: PersonInRelationship | None = None
