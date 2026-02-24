import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import CurrentUser, get_current_user
from app.models.person import Person
from app.models.tree import Tree
from app.models.user import UserRole
from app.schemas.person import PersonOut

router = APIRouter()
logger = structlog.get_logger()


@router.get("/search", response_model=list[PersonOut])
async def search_persons(
    current_user: CurrentUser,
    q: str = Query(..., min_length=1, description="Search query"),
    tree_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    search_term = f"%{q}%"

    query = select(Person).where(
        or_(
            Person.first_name.ilike(search_term),
            Person.last_name.ilike(search_term),
            Person.patronymic.ilike(search_term),
            Person.birth_place.ilike(search_term),
        )
    )

    if tree_id:
        tree_result = await db.execute(select(Tree).where(Tree.id == tree_id))
        tree = tree_result.scalar_one_or_none()
        if not tree:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tree not found")

        if tree.owner_id != current_user.id and current_user.role not in (UserRole.admin, UserRole.editor):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        query = query.where(Person.tree_id == tree_id)
    else:
        if current_user.role not in (UserRole.admin,):
            owned_trees_query = select(Tree.id).where(Tree.owner_id == current_user.id)
            query = query.where(Person.tree_id.in_(owned_trees_query))

    query = query.order_by(Person.last_name, Person.first_name).limit(50)
    result = await db.execute(query)
    persons = result.scalars().all()

    logger.debug("Search performed", query=q, tree_id=str(tree_id) if tree_id else None, results=len(persons))
    return persons
