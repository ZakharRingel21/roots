"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    op.create_table(
        "trees",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_table(
        "persons",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("tree_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("first_name", sa.String(), nullable=False),
        sa.Column("last_name", sa.String(), nullable=False),
        sa.Column("patronymic", sa.String(), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("birth_place", sa.String(), nullable=True),
        sa.Column("death_date", sa.Date(), nullable=True),
        sa.Column("death_place", sa.String(), nullable=True),
        sa.Column("burial_place", sa.String(), nullable=True),
        sa.Column("residence", sa.String(), nullable=True),
        sa.Column("avatar_url", sa.String(), nullable=True),
        sa.Column("avatar_thumb_url", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["tree_id"], ["trees.id"], ondelete="CASCADE"),
    )

    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=True),
        sa.Column(
            "role",
            sa.Enum("admin", "editor", "user", "guest", name="userrole"),
            nullable=False,
            server_default="user",
        ),
        sa.Column(
            "person_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.Enum("active", "pending", "blocked", name="userstatus"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("oauth_provider", sa.String(), nullable=True),
        sa.Column("oauth_id", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["person_id"], ["persons.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )

    op.create_foreign_key(
        "fk_trees_owner_id",
        "trees",
        "users",
        ["owner_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.create_table(
        "relationships",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("tree_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("person_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("related_person_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "relationship_type",
            sa.Enum("parent", "child", "spouse", "sibling", name="relationshiptype"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["tree_id"], ["trees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["person_id"], ["persons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["related_person_id"], ["persons.id"], ondelete="CASCADE"),
        sa.UniqueConstraint(
            "person_id", "related_person_id", "relationship_type", name="uq_relationship"
        ),
    )

    op.create_table(
        "person_photos",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("person_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("file_url", sa.String(), nullable=False),
        sa.Column("caption", sa.String(200), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["person_id"], ["persons.id"], ondelete="CASCADE"),
    )

    op.create_table(
        "person_documents",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("person_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("file_url", sa.String(), nullable=False),
        sa.Column("file_name", sa.String(), nullable=False),
        sa.Column("file_type", sa.String(), nullable=False),
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["person_id"], ["persons.id"], ondelete="CASCADE"),
    )

    op.create_table(
        "person_sections",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("person_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("content_html", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.ForeignKeyConstraint(["person_id"], ["persons.id"], ondelete="CASCADE"),
    )

    op.create_table(
        "edit_proposals",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("proposed_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_person_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("field_changes", postgresql.JSONB(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "accepted",
                "rejected",
                "clarification_requested",
                name="proposalstatus",
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["proposed_by"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_person_id"], ["persons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"], ondelete="SET NULL"),
    )

    op.create_table(
        "invitations",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_person_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("max_uses", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("used_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_person_id"], ["persons.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("token", name="uq_invitations_token"),
    )

    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_persons_tree_id", "persons", ["tree_id"])
    op.create_index("ix_relationships_tree_id", "relationships", ["tree_id"])
    op.create_index("ix_relationships_person_id", "relationships", ["person_id"])
    op.create_index("ix_relationships_related_person_id", "relationships", ["related_person_id"])
    op.create_index("ix_person_photos_person_id", "person_photos", ["person_id"])
    op.create_index("ix_person_documents_person_id", "person_documents", ["person_id"])
    op.create_index("ix_person_sections_person_id", "person_sections", ["person_id"])
    op.create_index("ix_edit_proposals_proposed_by", "edit_proposals", ["proposed_by"])
    op.create_index("ix_edit_proposals_target_person_id", "edit_proposals", ["target_person_id"])
    op.create_index("ix_edit_proposals_status", "edit_proposals", ["status"])
    op.create_index("ix_invitations_token", "invitations", ["token"], unique=True)

    op.execute(
        """
        CREATE INDEX ix_persons_first_name_trgm
        ON persons USING GIN (first_name gin_trgm_ops)
        """
    )
    op.execute(
        """
        CREATE INDEX ix_persons_last_name_trgm
        ON persons USING GIN (last_name gin_trgm_ops)
        """
    )
    op.execute(
        """
        CREATE INDEX ix_persons_patronymic_trgm
        ON persons USING GIN (patronymic gin_trgm_ops)
        """
    )
    op.execute(
        """
        CREATE INDEX ix_persons_birth_place_trgm
        ON persons USING GIN (birth_place gin_trgm_ops)
        """
    )


def downgrade() -> None:
    op.drop_table("invitations")
    op.drop_table("edit_proposals")
    op.drop_table("person_sections")
    op.drop_table("person_documents")
    op.drop_table("person_photos")
    op.drop_table("relationships")
    op.drop_table("users")
    op.drop_table("persons")
    op.drop_table("trees")

    op.execute("DROP TYPE IF EXISTS proposalstatus")
    op.execute("DROP TYPE IF EXISTS relationshiptype")
    op.execute("DROP TYPE IF EXISTS userstatus")
    op.execute("DROP TYPE IF EXISTS userrole")
