from __future__ import annotations

import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.deps import get_current_user
from app.models import FileAsset, User
from app.services.audit import push_log

router = APIRouter(prefix="/files", tags=["files"])


@router.post("/upload")
async def upload(file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    fid = f"file-{uuid.uuid4().hex[:12]}"
    suffix = Path(file.filename or "bin").suffix
    dest = settings.storage_dir / "uploads" / f"{fid}{suffix}"
    async with aiofiles.open(dest, "wb") as f:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            await f.write(chunk)
    size = dest.stat().st_size
    db.add(
        FileAsset(
            id=fid,
            path=str(dest),
            mime=file.content_type,
            size=size,
            uploader_id=user.id,
        )
    )
    push_log(db, actor_id=user.id, actor_name=user.name, action="上传文件", detail=f"{fid} {file.filename}")
    db.commit()
    return {"id": fid, "path": str(dest), "url": f"/api/v1/files/{fid}/download", "size": size, "name": file.filename}


@router.get("/{file_id}/download")
def download(file_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    asset = db.get(FileAsset, file_id)
    if not asset:
        from fastapi import HTTPException

        raise HTTPException(404, "文件不存在")
    return FileResponse(asset.path, filename=Path(asset.path).name)
