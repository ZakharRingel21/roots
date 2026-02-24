import secrets
import uuid
from datetime import datetime, timedelta, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import CurrentUser, get_current_user, require_role
from app.models.invitation import Invitation
from app.models.user import UserRole
from app.schemas.invitation import InvitationCreate, InvitationOut, InvitationValidate

router = APIRouter()
logger = structlog.get_logger()


@router.post("/invitations", response_model=InvitationOut, status_code=status.HTTP_201_CREATED)
async def create_invitation(
    payload: InvitationCreate,
    current_user=Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=payload.expires_hours)

    invitation = Invitation(
        token=token,
        created_by=current_user.id,
        target_person_id=payload.target_person_id,
        expires_at=expires_at,
        max_uses=payload.max_uses,
        used_count=0,
    )
    db.add(invitation)
    await db.flush()
    await db.refresh(invitation)
    logger.info("Invitation created", invitation_id=str(invitation.id), token=token[:8] + "...")
    return invitation


@router.get("/invitations", response_model=list[InvitationOut])
async def list_invitations(
    current_user=Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invitation)
        .where(Invitation.created_by == current_user.id)
        .order_by(Invitation.expires_at.desc())
    )
    return result.scalars().all()


@router.get("/invitations/{token}", response_model=InvitationValidate)
async def validate_invitation(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Invitation).where(Invitation.token == token))
    invitation = result.scalar_one_or_none()

    if not invitation:
        return InvitationValidate(valid=False, target_person_id=None, message="Invalid token")

    now = datetime.now(timezone.utc)
    expires_at = invitation.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < now:
        return InvitationValidate(valid=False, target_person_id=None, message="Invitation expired")

    if invitation.used_count >= invitation.max_uses:
        return InvitationValidate(valid=False, target_person_id=None, message="Invitation fully used")

    return InvitationValidate(
        valid=True,
        target_person_id=invitation.target_person_id,
        message="Valid invitation",
    )


@router.delete("/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_invitation(
    invitation_id: uuid.UUID,
    current_user=Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Invitation).where(Invitation.id == invitation_id))
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")

    if invitation.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your invitation")

    await db.delete(invitation)
    logger.info("Invitation revoked", invitation_id=str(invitation_id))
