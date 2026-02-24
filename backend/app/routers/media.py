import io
import uuid

import structlog
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import CurrentUser, get_current_user
from app.models.media import PersonDocument, PersonPhoto
from app.models.person import Person
from app.models.tree import Tree
from app.models.user import UserRole
from app.schemas.media import DocumentOut, PhotoOut, PhotoUpdate
from app.services.storage import delete_file, upload_file, upload_image_with_thumb

router = APIRouter()
logger = structlog.get_logger()

ALLOWED_IMAGE_MIME = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_DOC_MIME = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
}
MAX_PHOTO_SIZE = 5 * 1024 * 1024
MAX_DOC_SIZE = 20 * 1024 * 1024


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


@router.post("/persons/{person_id}/photos", response_model=PhotoOut, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    person_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
):
    person = await _get_person_with_access(person_id, current_user, db)

    content_type = file.content_type or ""
    if content_type not in ALLOWED_IMAGE_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported image type: {content_type}. Allowed: JPEG, PNG, WEBP",
        )

    file_bytes = await file.read()

    import magic as python_magic

    try:
        detected_mime = python_magic.from_buffer(file_bytes, mime=True)
    except Exception:
        detected_mime = content_type

    if detected_mime not in ALLOWED_IMAGE_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File content does not match allowed image types",
        )

    if len(file_bytes) > MAX_PHOTO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Photo exceeds 5MB limit",
        )

    full_url, thumb_url = await upload_image_with_thumb(file_bytes, file.filename or "photo.jpg")

    photo = PersonPhoto(
        person_id=person_id,
        file_url=full_url,
    )
    db.add(photo)
    await db.flush()
    await db.refresh(photo)
    logger.info("Photo uploaded", photo_id=str(photo.id), person_id=str(person_id))
    return photo


@router.get("/persons/{person_id}/photos", response_model=list[PhotoOut])
async def list_photos(
    person_id: uuid.UUID,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
):
    await _get_person_with_access(person_id, current_user, db)
    result = await db.execute(
        select(PersonPhoto)
        .where(PersonPhoto.person_id == person_id)
        .order_by(PersonPhoto.sort_order, PersonPhoto.uploaded_at)
    )
    return result.scalars().all()


@router.put("/photos/{photo_id}", response_model=PhotoOut)
async def update_photo(
    photo_id: uuid.UUID,
    payload: PhotoUpdate,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PersonPhoto).where(PersonPhoto.id == photo_id))
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    await _get_person_with_access(photo.person_id, current_user, db)

    if payload.caption is not None:
        photo.caption = payload.caption
    if payload.sort_order is not None:
        photo.sort_order = payload.sort_order

    await db.flush()
    await db.refresh(photo)
    return photo


@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    photo_id: uuid.UUID,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PersonPhoto).where(PersonPhoto.id == photo_id))
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    await _get_person_with_access(photo.person_id, current_user, db)
    await delete_file(photo.file_url)
    await db.delete(photo)
    logger.info("Photo deleted", photo_id=str(photo_id))


@router.post("/persons/{person_id}/documents", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    person_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
):
    person = await _get_person_with_access(person_id, current_user, db)

    content_type = file.content_type or ""
    file_bytes = await file.read()

    try:
        import magic as python_magic
        detected_mime = python_magic.from_buffer(file_bytes, mime=True)
    except Exception:
        detected_mime = content_type

    if detected_mime not in ALLOWED_DOC_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {detected_mime}",
        )

    if len(file_bytes) > MAX_DOC_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Document exceeds 20MB limit",
        )

    original_filename = file.filename or "document"
    file_url = await upload_file(file_bytes, original_filename, detected_mime, "documents")

    doc = PersonDocument(
        person_id=person_id,
        file_url=file_url,
        file_name=original_filename,
        file_type=detected_mime,
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    logger.info("Document uploaded", doc_id=str(doc.id), person_id=str(person_id))
    return doc


@router.get("/persons/{person_id}/documents", response_model=list[DocumentOut])
async def list_documents(
    person_id: uuid.UUID,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
):
    await _get_person_with_access(person_id, current_user, db)
    result = await db.execute(
        select(PersonDocument)
        .where(PersonDocument.person_id == person_id)
        .order_by(PersonDocument.uploaded_at.desc())
    )
    return result.scalars().all()


@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: uuid.UUID,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PersonDocument).where(PersonDocument.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    await _get_person_with_access(doc.person_id, current_user, db)
    await delete_file(doc.file_url)
    await db.delete(doc)
    logger.info("Document deleted", doc_id=str(doc_id))
