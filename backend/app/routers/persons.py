import uuid
from datetime import datetime

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import CurrentUser, get_current_user, require_role
from app.models.person import Person
from app.models.relationship import Relationship
from app.models.tree import Tree
from app.models.user import UserRole
from app.schemas.person import PersonCreate, PersonOut, PersonUpdate
from app.schemas.relationship import RelationshipWithPersonOut

router = APIRouter()
logger = structlog.get_logger()


async def _get_person_or_404(person_id: uuid.UUID, db: AsyncSession) -> Person:
    result = await db.execute(select(Person).where(Person.id == person_id))
    person = result.scalar_one_or_none()
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    return person


async def _verify_tree_access(tree_id: uuid.UUID, current_user, db: AsyncSession) -> Tree:
    result = await db.execute(select(Tree).where(Tree.id == tree_id))
    tree = result.scalar_one_or_none()
    if not tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tree not found")
    if tree.owner_id != current_user.id and current_user.role not in (UserRole.admin, UserRole.editor):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return tree


@router.get("/persons/{person_id}", response_model=PersonOut)
async def get_person(
    person_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    person = await _get_person_or_404(person_id, db)
    await _verify_tree_access(person.tree_id, current_user, db)
    return person


@router.post("/trees/{tree_id}/persons", response_model=PersonOut, status_code=status.HTTP_201_CREATED)
async def create_person(
    tree_id: uuid.UUID,
    payload: PersonCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    await _verify_tree_access(tree_id, current_user, db)

    person = Person(
        tree_id=tree_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        patronymic=payload.patronymic,
        birth_date=payload.birth_date,
        birth_place=payload.birth_place,
        death_date=payload.death_date,
        death_place=payload.death_place,
        burial_place=payload.burial_place,
        residence=payload.residence,
    )
    db.add(person)
    await db.flush()
    await db.refresh(person)
    logger.info("Person created", person_id=str(person.id), tree_id=str(tree_id))
    return person


@router.put("/persons/{person_id}", response_model=PersonOut)
async def update_person(
    person_id: uuid.UUID,
    payload: PersonUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    person = await _get_person_or_404(person_id, db)
    tree = await _verify_tree_access(person.tree_id, current_user, db)

    if current_user.role == UserRole.user:
        from app.models.proposal import EditProposal, ProposalStatus

        field_changes = {}
        update_data = payload.model_dump(exclude_none=True)
        for field, new_value in update_data.items():
            old_value = getattr(person, field, None)
            if old_value != new_value:
                field_changes[field] = {
                    "before": str(old_value) if old_value is not None else None,
                    "after": str(new_value) if new_value is not None else None,
                }

        if field_changes:
            proposal = EditProposal(
                proposed_by=current_user.id,
                target_person_id=person_id,
                field_changes=field_changes,
                status=ProposalStatus.pending,
            )
            db.add(proposal)
            raise HTTPException(
                status_code=status.HTTP_202_ACCEPTED,
                detail="Edit proposal submitted for review",
            )
        return person

    update_data = payload.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(person, field, value)
    person.updated_at = datetime.utcnow()

    await db.flush()
    await db.refresh(person)
    logger.info("Person updated", person_id=str(person_id))
    return person


@router.delete("/persons/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_person(
    person_id: uuid.UUID,
    current_user=Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    person = await _get_person_or_404(person_id, db)

    rels_result = await db.execute(
        select(Relationship).where(
            (Relationship.person_id == person_id) | (Relationship.related_person_id == person_id)
        )
    )
    for rel in rels_result.scalars().all():
        await db.delete(rel)

    await db.delete(person)
    logger.info("Person deleted", person_id=str(person_id))


@router.get("/persons/{person_id}/relationships", response_model=list[RelationshipWithPersonOut])
async def get_person_relationships(
    person_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    person = await _get_person_or_404(person_id, db)
    await _verify_tree_access(person.tree_id, current_user, db)

    rels_result = await db.execute(
        select(Relationship).where(Relationship.person_id == person_id)
    )
    relationships = rels_result.scalars().all()

    result = []
    for rel in relationships:
        related_result = await db.execute(select(Person).where(Person.id == rel.related_person_id))
        related_person = related_result.scalar_one_or_none()
        item = RelationshipWithPersonOut.model_validate(rel)
        if related_person:
            from app.schemas.relationship import PersonInRelationship
            item.related = PersonInRelationship.model_validate(related_person)
        result.append(item)

    return result
