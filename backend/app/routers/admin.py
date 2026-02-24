import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import require_role
from app.models.person import Person
from app.models.proposal import EditProposal, ProposalStatus
from app.models.tree import Tree
from app.models.user import User, UserRole, UserStatus
from app.schemas.auth import UserOut
from pydantic import BaseModel

router = APIRouter()
logger = structlog.get_logger()


class UserPatch(BaseModel):
    role: UserRole | None = None
    status: UserStatus | None = None


class AdminStats(BaseModel):
    total_users: int
    total_persons: int
    total_trees: int
    pending_proposals: int
    pending_proposals_by_tree: list[dict]


@router.get("/users", response_model=list[UserOut])
async def list_users(
    current_user=Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.patch("/users/{user_id}", response_model=UserOut)
async def patch_user(
    user_id: uuid.UUID,
    payload: UserPatch,
    current_user=Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == current_user.id and payload.role and payload.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove your own admin role",
        )

    if payload.role is not None:
        user.role = payload.role
    if payload.status is not None:
        user.status = payload.status

    await db.flush()
    await db.refresh(user)
    logger.info("User updated by admin", user_id=str(user_id), admin_id=str(current_user.id))
    return user


@router.get("/stats", response_model=AdminStats)
async def get_stats(
    current_user=Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    users_count = await db.execute(select(func.count(User.id)))
    total_users = users_count.scalar_one()

    persons_count = await db.execute(select(func.count(Person.id)))
    total_persons = persons_count.scalar_one()

    trees_count = await db.execute(select(func.count(Tree.id)))
    total_trees = trees_count.scalar_one()

    pending_count = await db.execute(
        select(func.count(EditProposal.id)).where(EditProposal.status == ProposalStatus.pending)
    )
    pending_proposals = pending_count.scalar_one()

    pending_by_tree_result = await db.execute(
        select(Tree.id, Tree.name, func.count(EditProposal.id).label("pending_count"))
        .join(Person, Person.tree_id == Tree.id)
        .join(EditProposal, EditProposal.target_person_id == Person.id)
        .where(EditProposal.status == ProposalStatus.pending)
        .group_by(Tree.id, Tree.name)
        .order_by(func.count(EditProposal.id).desc())
    )
    pending_by_tree = [
        {"tree_id": str(row.id), "tree_name": row.name, "pending_count": row.pending_count}
        for row in pending_by_tree_result.all()
    ]

    return AdminStats(
        total_users=total_users,
        total_persons=total_persons,
        total_trees=total_trees,
        pending_proposals=pending_proposals,
        pending_proposals_by_tree=pending_by_tree,
    )
