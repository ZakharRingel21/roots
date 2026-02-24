import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    editor = "editor"
    user = "user"
    guest = "guest"


class UserStatus(str, enum.Enum):
    active = "active"
    pending = "pending"
    blocked = "blocked"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()")
    )
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="userrole"), nullable=False, default=UserRole.user
    )
    person_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("persons.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus, name="userstatus"), nullable=False, default=UserStatus.pending
    )
    oauth_provider: Mapped[str | None] = mapped_column(String, nullable=True)
    oauth_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )

    person: Mapped["Person | None"] = relationship(
        "Person", foreign_keys=[person_id], back_populates="linked_user"
    )
    owned_trees: Mapped[list["Tree"]] = relationship(
        "Tree", back_populates="owner", cascade="all, delete-orphan"
    )
    proposals_submitted: Mapped[list["EditProposal"]] = relationship(
        "EditProposal", foreign_keys="EditProposal.proposed_by", back_populates="proposer"
    )
    proposals_reviewed: Mapped[list["EditProposal"]] = relationship(
        "EditProposal", foreign_keys="EditProposal.reviewed_by", back_populates="reviewer"
    )
    invitations_created: Mapped[list["Invitation"]] = relationship(
        "Invitation", back_populates="creator"
    )
