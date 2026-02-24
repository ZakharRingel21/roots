import enum
import uuid

from sqlalchemy import Enum, ForeignKey, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class RelationshipType(str, enum.Enum):
    parent = "parent"
    child = "child"
    spouse = "spouse"
    sibling = "sibling"


class Relationship(Base):
    __tablename__ = "relationships"
    __table_args__ = (
        UniqueConstraint("person_id", "related_person_id", "relationship_type", name="uq_relationship"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()")
    )
    tree_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trees.id", ondelete="CASCADE"), nullable=False
    )
    person_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("persons.id", ondelete="CASCADE"), nullable=False
    )
    related_person_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("persons.id", ondelete="CASCADE"), nullable=False
    )
    relationship_type: Mapped[RelationshipType] = mapped_column(
        Enum(RelationshipType, name="relationshiptype"), nullable=False
    )

    tree: Mapped["Tree"] = relationship("Tree", back_populates="relationships")
    person: Mapped["Person"] = relationship(
        "Person", foreign_keys=[person_id], back_populates="relationships_as_person"
    )
    related_person: Mapped["Person"] = relationship(
        "Person", foreign_keys=[related_person_id], back_populates="relationships_as_related"
    )
