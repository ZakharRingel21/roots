import uuid
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import CurrentUser, get_current_user, require_role
from app.models.person import Person
from app.models.proposal import EditProposal, ProposalStatus
from app.models.user import UserRole
from app.schemas.proposal import ProposalCreate, ProposalOut, ProposalReview

router = APIRouter()
logger = structlog.get_logger()


@router.post("/proposals", response_model=ProposalOut, status_code=status.HTTP_201_CREATED)
async def create_proposal(
    payload: ProposalCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    person_result = await db.execute(select(Person).where(Person.id == payload.target_person_id))
    person = person_result.scalar_one_or_none()
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")

    field_changes_dict = {
        field: change.model_dump() for field, change in payload.field_changes.items()
    }

    proposal = EditProposal(
        proposed_by=current_user.id,
        target_person_id=payload.target_person_id,
        field_changes=field_changes_dict,
        status=ProposalStatus.pending,
    )
    db.add(proposal)
    await db.flush()
    await db.refresh(proposal)
    logger.info("Proposal created", proposal_id=str(proposal.id), person_id=str(payload.target_person_id))
    return proposal


@router.get("/proposals", response_model=list[ProposalOut])
async def list_proposals(
    current_user: CurrentUser,
    tree_id: uuid.UUID | None = Query(None),
    status_filter: ProposalStatus | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
):
    query = select(EditProposal)

    if current_user.role not in (UserRole.admin, UserRole.editor):
        query = query.where(EditProposal.proposed_by == current_user.id)

    if status_filter:
        query = query.where(EditProposal.status == status_filter)

    if tree_id:
        query = query.join(Person, EditProposal.target_person_id == Person.id).where(
            Person.tree_id == tree_id
        )

    query = query.order_by(EditProposal.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.patch("/proposals/{proposal_id}", response_model=ProposalOut)
async def review_proposal(
    proposal_id: uuid.UUID,
    payload: ProposalReview,
    current_user=Depends(require_role(UserRole.admin, UserRole.editor)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(EditProposal).where(EditProposal.id == proposal_id))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found")

    if proposal.status != ProposalStatus.pending and payload.status != ProposalStatus.clarification_requested:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Proposal is already reviewed",
        )

    proposal.status = payload.status
    proposal.reviewed_by = current_user.id
    proposal.comment = payload.comment
    proposal.reviewed_at = datetime.now(timezone.utc)

    if payload.status == ProposalStatus.accepted:
        person_result = await db.execute(
            select(Person).where(Person.id == proposal.target_person_id)
        )
        person = person_result.scalar_one_or_none()
        if person:
            for field, change in proposal.field_changes.items():
                if hasattr(person, field) and isinstance(change, dict):
                    new_value = change.get("after")
                    setattr(person, field, new_value)
            person.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(proposal)
    logger.info(
        "Proposal reviewed",
        proposal_id=str(proposal_id),
        status=payload.status.value,
        reviewer=str(current_user.id),
    )
    return proposal
