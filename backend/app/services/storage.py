import io
import uuid
from urllib.parse import urlparse

import structlog
from minio import Minio
from minio.error import S3Error
from PIL import Image

from app.config import settings

logger = structlog.get_logger()

_minio_client: Minio | None = None

MAX_FULL_SIZE = 1200
THUMB_SIZE = 80


def _endpoint_host() -> str:
    """Strip http(s):// prefix — MinIO SDK expects host:port only."""
    endpoint = settings.STORAGE_ENDPOINT
    if "://" in endpoint:
        endpoint = endpoint.split("://", 1)[1]
    return endpoint.rstrip("/")


def get_minio_client() -> Minio:
    global _minio_client
    if _minio_client is None:
        _minio_client = Minio(
            _endpoint_host(),
            access_key=settings.STORAGE_ACCESS_KEY,
            secret_key=settings.STORAGE_SECRET_KEY,
            secure=settings.STORAGE_USE_SSL,
        )
    return _minio_client


async def init_storage() -> None:
    client = get_minio_client()
    try:
        if not client.bucket_exists(settings.STORAGE_BUCKET):
            client.make_bucket(settings.STORAGE_BUCKET)
            policy = f"""{{
                "Version": "2012-10-17",
                "Statement": [
                    {{
                        "Effect": "Allow",
                        "Principal": {{"AWS": ["*"]}},
                        "Action": ["s3:GetObject"],
                        "Resource": ["arn:aws:s3:::{settings.STORAGE_BUCKET}/*"]
                    }}
                ]
            }}"""
            client.set_bucket_policy(settings.STORAGE_BUCKET, policy)
            logger.info("Created MinIO bucket", bucket=settings.STORAGE_BUCKET)
        else:
            logger.info("MinIO bucket already exists", bucket=settings.STORAGE_BUCKET)
    except S3Error as e:
        logger.error("Failed to initialize MinIO storage", error=str(e))
        raise


def _build_public_url(object_name: str) -> str:
    protocol = "https" if settings.STORAGE_USE_SSL else "http"
    return f"{protocol}://{settings.STORAGE_ENDPOINT}/{settings.STORAGE_BUCKET}/{object_name}"


async def upload_file(
    file_bytes: bytes,
    filename: str,
    content_type: str,
    bucket_subfolder: str = "",
) -> str:
    client = get_minio_client()
    unique_name = f"{uuid.uuid4()}_{filename}"
    object_name = f"{bucket_subfolder}/{unique_name}".lstrip("/")

    client.put_object(
        settings.STORAGE_BUCKET,
        object_name,
        io.BytesIO(file_bytes),
        length=len(file_bytes),
        content_type=content_type,
    )

    return _build_public_url(object_name)


async def upload_image_with_thumb(
    file_bytes: bytes,
    filename: str,
) -> tuple[str, str]:
    img = Image.open(io.BytesIO(file_bytes))

    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    full_img = img.copy()
    if full_img.width > MAX_FULL_SIZE or full_img.height > MAX_FULL_SIZE:
        full_img.thumbnail((MAX_FULL_SIZE, MAX_FULL_SIZE), Image.LANCZOS)

    full_buffer = io.BytesIO()
    full_img.save(full_buffer, format="JPEG", quality=85, optimize=True)
    full_bytes = full_buffer.getvalue()

    thumb_img = img.copy()
    thumb_img.thumbnail((THUMB_SIZE * 4, THUMB_SIZE * 4), Image.LANCZOS)
    left = (thumb_img.width - THUMB_SIZE) // 2 if thumb_img.width > THUMB_SIZE else 0
    top = (thumb_img.height - THUMB_SIZE) // 2 if thumb_img.height > THUMB_SIZE else 0
    right = left + THUMB_SIZE if thumb_img.width >= THUMB_SIZE else thumb_img.width
    bottom = top + THUMB_SIZE if thumb_img.height >= THUMB_SIZE else thumb_img.height
    thumb_img = thumb_img.crop((left, top, right, bottom))

    if thumb_img.width != THUMB_SIZE or thumb_img.height != THUMB_SIZE:
        thumb_img = thumb_img.resize((THUMB_SIZE, THUMB_SIZE), Image.LANCZOS)

    thumb_buffer = io.BytesIO()
    thumb_img.save(thumb_buffer, format="JPEG", quality=80, optimize=True)
    thumb_bytes = thumb_buffer.getvalue()

    base_name = filename.rsplit(".", 1)[0]
    full_url = await upload_file(full_bytes, f"{base_name}.jpg", "image/jpeg", "photos")
    thumb_url = await upload_file(thumb_bytes, f"{base_name}_thumb.jpg", "image/jpeg", "photos/thumbs")

    return full_url, thumb_url


async def delete_file(url: str) -> bool:
    client = get_minio_client()
    try:
        parsed = urlparse(url)
        path = parsed.path.lstrip("/")
        parts = path.split("/", 1)
        if len(parts) < 2:
            return False
        object_name = parts[1]

        client.remove_object(settings.STORAGE_BUCKET, object_name)
        return True
    except S3Error as e:
        logger.error("Failed to delete file from MinIO", url=url, error=str(e))
        return False
