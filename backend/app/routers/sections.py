import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import CurrentUser, get_current_user
from app.models.person import Person
from app.models.section import PersonSection
from app.models.tree import Tree
from app.models.user import UserRole
from app.schemas.section import SectionCreate, SectionOut, SectionUpdate

router = APIRouter()
logger = structlog.get_logger()


async def _get_person_with_access(
    person_id: uuid.UUID, current_user, db: AsyncSession
) -> Person:
    result = await db.execute(select(Person).where(Person.id == person_id))
    person = result.scalar_one_or_none()
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")

    tree_result = await db.execute(select(Tree).where(Tree.id == person.tree_id))
    tree = tree_result.scalar_one_or_none()
    if not tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tree not found")

    if tree.owner_id != current_user.id and current_user.role not in (UserRole.admin, UserRole.editor):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return person


@router.get("/persons/{person_id}/sections", response_model=list[SectionOut])
async def list_sections(
    person_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    await _get_person_with_access(person_id, current_user, db)
    result = await db.execute(
        select(PersonSection)
        .where(PersonSection.person_id == person_id)
        .order_by(PersonSection.sort_order)
    )
    return result.scalars().all()


@router.post("/persons/{person_id}/sections", response_model=SectionOut, status_code=status.HTTP_201_CREATED)
async def create_section(
    person_id: uuid.UUID,
    payload: SectionCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    await _get_person_with_access(person_id, current_user, db)

    section = PersonSection(
        person_id=person_id,
        title=payload.title,
        content_html=payload.content_html,
        sort_order=payload.sort_order,
    )
    db.add(section)
    await db.flush()
    await db.refresh(section)
    logger.info("Section created", section_id=str(section.id), person_id=str(person_id))
    return section


@router.put("/sections/{section_id}", response_model=SectionOut)
async def update_section(
    section_id: uuid.UUID,
    payload: SectionUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PersonSection).where(PersonSection.id == section_id))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")

    await _get_person_with_access(section.person_id, current_user, db)

    if payload.title is not None:
        section.title = payload.title
    if payload.content_html is not None:
        section.content_html = payload.content_html
    if payload.sort_order is not None:
        section.sort_order = payload.sort_order

    await db.flush()
    await db.refresh(section)
    return section


@router.delete("/sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_section(
    section_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PersonSection).where(PersonSection.id == section_id))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")

    await _get_person_with_access(section.person_id, current_user, db)
    await db.delete(section)
    logger.info("Section deleted", section_id=str(section_id))
