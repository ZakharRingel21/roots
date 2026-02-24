import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import CurrentUser, get_current_user
from app.models.person import Person
from app.models.relationship import Relationship, RelationshipType
from app.models.tree import Tree
from app.models.user import UserRole
from app.schemas.relationship import RelationshipCreate, RelationshipOut

router = APIRouter()
logger = structlog.get_logger()

INVERSE_RELATIONSHIP: dict[RelationshipType, RelationshipType] = {
    RelationshipType.parent: RelationshipType.child,
    RelationshipType.child: RelationshipType.parent,
    RelationshipType.spouse: RelationshipType.spouse,
    RelationshipType.sibling: RelationshipType.sibling,
}


async def _verify_tree_ownership(tree_id: uuid.UUID, current_user, db: AsyncSession) -> Tree:
    result = await db.execute(select(Tree).where(Tree.id == tree_id))
    tree = result.scalar_one_or_none()
    if not tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tree not found")
    if tree.owner_id != current_user.id and current_user.role not in (UserRole.admin, UserRole.editor):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return tree


@router.post("/relationships", response_model=RelationshipOut, status_code=status.HTTP_201_CREATED)
async def create_relationship(
    payload: RelationshipCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    tree = await _verify_tree_ownership(payload.tree_id, current_user, db)

    person_result = await db.execute(
        select(Person).where(Person.id == payload.person_id, Person.tree_id == payload.tree_id)
    )
    if not person_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found in tree")

    related_result = await db.execute(
        select(Person).where(
            Person.id == payload.related_person_id, Person.tree_id == payload.tree_id
        )
    )
    if not related_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Related person not found in tree"
        )

    existing = await db.execute(
        select(Relationship).where(
            Relationship.person_id == payload.person_id,
            Relationship.related_person_id == payload.related_person_id,
            Relationship.relationship_type == payload.relationship_type,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Relationship already exists"
        )

    rel = Relationship(
        tree_id=payload.tree_id,
        person_id=payload.person_id,
        related_person_id=payload.related_person_id,
        relationship_type=payload.relationship_type,
    )
    db.add(rel)

    inverse_type = INVERSE_RELATIONSHIP.get(payload.relationship_type)
    if inverse_type:
        inverse_existing = await db.execute(
            select(Relationship).where(
                Relationship.person_id == payload.related_person_id,
                Relationship.related_person_id == payload.person_id,
                Relationship.relationship_type == inverse_type,
            )
        )
        if not inverse_existing.scalar_one_or_none():
            inverse_rel = Relationship(
                tree_id=payload.tree_id,
                person_id=payload.related_person_id,
                related_person_id=payload.person_id,
                relationship_type=inverse_type,
            )
            db.add(inverse_rel)

    await db.flush()
    await db.refresh(rel)
    logger.info(
        "Relationship created",
        rel_id=str(rel.id),
        person_id=str(payload.person_id),
        related_person_id=str(payload.related_person_id),
        type=payload.relationship_type.value,
    )
    return rel


@router.delete("/relationships/{relationship_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_relationship(
    relationship_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Relationship).where(Relationship.id == relationship_id))
    rel = result.scalar_one_or_none()
    if not rel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relationship not found")

    await _verify_tree_ownership(rel.tree_id, current_user, db)

    inverse_type = INVERSE_RELATIONSHIP.get(rel.relationship_type)
    if inverse_type:
        inverse_result = await db.execute(
            select(Relationship).where(
                Relationship.person_id == rel.related_person_id,
                Relationship.related_person_id == rel.person_id,
                Relationship.relationship_type == inverse_type,
            )
        )
        inverse = inverse_result.scalar_one_or_none()
        if inverse:
            await db.delete(inverse)

    await db.delete(rel)
    logger.info("Relationship deleted", rel_id=str(relationship_id))
