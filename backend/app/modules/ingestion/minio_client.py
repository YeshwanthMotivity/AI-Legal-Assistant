import asyncio
import io
from minio import Minio
from app.config import settings


def _get_client() -> Minio:
    return Minio(
        f"{settings.minio_host}:{settings.minio_port}",
        access_key=settings.minio_root_user,
        secret_key=settings.minio_root_password,
        secure=False,
    )


async def upload_file(
    bucket: str,
    key: str,
    data: bytes,
    length: int,
    content_type: str,
) -> None:
    loop = asyncio.get_event_loop()

    def _upload() -> None:
        client = _get_client()
        client.put_object(
            bucket_name=bucket,
            object_name=key,
            data=io.BytesIO(data),
            length=length,
            content_type=content_type,
        )

    await loop.run_in_executor(None, _upload)


async def download_file(bucket: str, key: str) -> bytes:
    loop = asyncio.get_event_loop()

    def _download() -> bytes:
        client = _get_client()
        obj = client.get_object(bucket_name=bucket, object_name=key)
        try:
            return obj.read()
        finally:
            obj.close()
            obj.release_conn()

    return await loop.run_in_executor(None, _download)
