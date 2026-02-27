import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Gender(str, enum.Enum):
    male = "male"
    female = "female"


class Person(Base):
    __tablename__ = "persons"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()")
    )
    tree_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trees.id", ondelete="CASCADE"), nullable=False
    )
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    last_name: Mapped[str] = mapped_column(String, nullable=False)
    patronymic: Mapped[str | None] = mapped_column(String, nullable=True)
    maiden_name: Mapped[str | None] = mapped_column(String, nullable=True)
    gender: Mapped[Gender | None] = mapped_column(
        Enum(Gender, name="gender", create_type=False), nullable=True
    )
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    birth_place: Mapped[str | None] = mapped_column(String, nullable=True)
    death_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    death_place: Mapped[str | None] = mapped_column(String, nullable=True)
    burial_place: Mapped[str | None] = mapped_column(String, nullable=True)
    residence: Mapped[str | None] = mapped_column(String, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    avatar_thumb_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), onupdate=datetime.utcnow
    )

    tree: Mapped["Tree"] = relationship("Tree", back_populates="persons")
    linked_user: Mapped["User | None"] = relationship(
        "User", foreign_keys="User.person_id", back_populates="person"
    )
    photos: Mapped[list["PersonPhoto"]] = relationship(
        "PersonPhoto", back_populates="person", cascade="all, delete-orphan"
    )
    documents: Mapped[list["PersonDocument"]] = relationship(
        "PersonDocument", back_populates="person", cascade="all, delete-orphan"
    )
    sections: Mapped[list["PersonSection"]] = relationship(
        "PersonSection", back_populates="person", cascade="all, delete-orphan"
    )
    proposals: Mapped[list["EditProposal"]] = relationship(
        "EditProposal", back_populates="target_person", cascade="all, delete-orphan"
    )
    relationships_as_person: Mapped[list["Relationship"]] = relationship(
        "Relationship",
        foreign_keys="Relationship.person_id",
        back_populates="person",
        cascade="all, delete-orphan",
    )
    relationships_as_related: Mapped[list["Relationship"]] = relationship(
        "Relationship",
        foreign_keys="Relationship.related_person_id",
        back_populates="related_person",
        cascade="all, delete-orphan",
    )
