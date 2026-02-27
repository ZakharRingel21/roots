"""Add gender and maiden_name to persons

Revision ID: 0002
Revises: 0001
Create Date: 2026-02-24 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE gender AS ENUM ('male', 'female');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
        """
    )
    op.add_column(
        "persons",
        sa.Column("gender", postgresql.ENUM("male", "female", name="gender", create_type=False), nullable=True),
    )
    op.add_column("persons", sa.Column("maiden_name", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("persons", "maiden_name")
    op.drop_column("persons", "gender")
    op.execute("DROP TYPE IF EXISTS gender")
