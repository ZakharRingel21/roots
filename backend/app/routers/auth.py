from datetime import timedelta

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.deps import CurrentUser, get_current_user
from app.models.user import User, UserRole, UserStatus
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.services.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    exchange_google_code,
    get_google_oauth_url,
    hash_password,
    verify_password,
)

router = APIRouter()
logger = structlog.get_logger()

AUTH_RATE_LIMIT: dict[str, int] = {}
AUTH_RATE_LIMIT_MAX = 10


def _set_auth_cookies(response: Response, user_id: str) -> tuple[str, str]:
    access_token = create_access_token(
        {"sub": user_id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_refresh_token({"sub": user_id})

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )
    return access_token, refresh_token


@router.post("/register", response_model=UserOut)
async def register(
    payload: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == payload.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    count_result = await db.execute(select(func.count(User.id)))
    user_count = count_result.scalar_one()

    role = UserRole.admin if user_count == 0 else UserRole.user
    user_status = UserStatus.active if user_count == 0 else UserStatus.pending

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=role,
        status=user_status,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    _set_auth_cookies(response, str(user.id))
    logger.info("User registered", user_id=str(user.id), email=user.email, role=role.value)
    return user


@router.post("/login", response_model=UserOut)
async def login(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.status == UserStatus.blocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is blocked",
        )

    _set_auth_cookies(response, str(user.id))
    logger.info("User logged in", user_id=str(user.id))
    return user


@router.post("/refresh")
async def refresh_token(
    response: Response,
    refresh_token: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    from fastapi import Cookie

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid refresh token",
    )

    if not refresh_token:
        raise credentials_exception

    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise credentials_exception

    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or user.status == UserStatus.blocked:
        raise credentials_exception

    new_access_token = create_access_token(
        {"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return {"detail": "Token refreshed"}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserOut)
async def me(current_user: CurrentUser):
    return current_user


@router.get("/google")
async def google_login():
    url = get_google_oauth_url()
    return RedirectResponse(url=url)


@router.get("/google/callback")
async def google_callback(
    code: str = Query(...),
    response: Response = None,
    db: AsyncSession = Depends(get_db),
):
    user_info = await exchange_google_code(code)
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to authenticate with Google",
        )

    google_id = user_info.get("sub")
    email = user_info.get("email")

    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incomplete user info from Google",
        )

    result = await db.execute(
        select(User).where(User.oauth_provider == "google", User.oauth_id == google_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user:
            user.oauth_provider = "google"
            user.oauth_id = google_id
        else:
            count_result = await db.execute(select(func.count(User.id)))
            user_count = count_result.scalar_one()
            role = UserRole.admin if user_count == 0 else UserRole.user
            user_status = UserStatus.active if user_count == 0 else UserStatus.pending

            user = User(
                email=email,
                oauth_provider="google",
                oauth_id=google_id,
                role=role,
                status=user_status,
            )
            db.add(user)
            await db.flush()
            await db.refresh(user)

    redirect_response = RedirectResponse(url=settings.FRONTEND_URL)
    _set_auth_cookies(redirect_response, str(user.id))
    logger.info("Google OAuth login", user_id=str(user.id))
    return redirect_response
