from __future__ import annotations

import sys
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.deps import get_current_user
from app.models import PreannotationResult, User
from app.services.audit import push_log

# allow importing platform/algo
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

router = APIRouter(prefix="/prelabel", tags=["prelabel"])


@router.get("/meta")
def meta():
    return {
        "entityTypes": ["PERSON", "DATE", "ORG", "ADDRESS", "PHONE", "ORDER_ID"],
        "relationTypes": ["投诉对象", "位于", "关联订单"],
        "classLabels": ["物流投诉", "退款售后", "改派地址", "其他"],
        "acceptSteps": ["confirm", "annotate", "qa", "accept"],
        "algoMode": settings.algo_mode,
    }


@router.get("/texts")
def list_texts(page: int = 1, pageSize: int = 20, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(PreannotationResult).filter(PreannotationResult.kind == "text")
    total = q.count()
    rows = q.offset((page - 1) * pageSize).limit(pageSize).all()
    return {
        "items": [
            {
                "id": r.id,
                "title": r.title,
                "status": r.status,
                "hasCorrection": r.human_payload is not None,
            }
            for r in rows
        ],
        "total": total,
        "page": page,
        "pageSize": pageSize,
    }


@router.get("/texts/{doc_id}")
def get_text(doc_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.get(PreannotationResult, doc_id)
    if not r or r.kind != "text":
        raise HTTPException(404, "文档不存在")
    return {
        "id": r.id,
        "title": r.title,
        "status": r.status,
        "text": (r.meta_json or {}).get("text", ""),
        "model": r.model_payload,
        "corrected": r.human_payload,
        "changeLog": r.diff_json or [],
    }


@router.post("/texts/{doc_id}/run")
def run_text(doc_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from algo.lite_nlp import annotate_text

    r = db.get(PreannotationResult, doc_id)
    if not r or r.kind != "text":
        raise HTTPException(404, "文档不存在")
    text = (r.meta_json or {}).get("text", "")
    result = annotate_text(text)
    r.model_payload = result
    r.status = "predicted"
    r.updated_at = datetime.utcnow()
    push_log(db, actor_id=user.id, actor_name=user.name, action="文本预标推理", detail=doc_id)
    db.commit()
    return result


class CorrectionIn(BaseModel):
    payload: dict


@router.put("/texts/{doc_id}/correction")
def correct_text(doc_id: str, body: CorrectionIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.get(PreannotationResult, doc_id)
    if not r:
        raise HTTPException(404, "文档不存在")
    diff = list(r.diff_json or [])
    diff.append({"at": datetime.utcnow().isoformat(), "by": user.name, "human": body.payload})
    r.human_payload = body.payload
    r.diff_json = diff
    r.status = "corrected"
    db.commit()
    return {"ok": True}


@router.get("/visions")
def list_visions(page: int = 1, pageSize: int = 20, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(PreannotationResult).filter(PreannotationResult.kind == "vision")
    total = q.count()
    rows = q.offset((page - 1) * pageSize).limit(pageSize).all()
    return {
        "items": [{"id": r.id, "title": r.title, "status": r.status} for r in rows],
        "total": total,
        "page": page,
        "pageSize": pageSize,
    }


@router.get("/visions/{image_id}")
def get_vision(image_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.get(PreannotationResult, image_id)
    if not r or r.kind != "vision":
        raise HTTPException(404, "图像不存在")
    mp = r.model_payload or {}
    return {
        "id": r.id,
        "title": r.title,
        "status": r.status,
        "imagePath": (r.meta_json or {}).get("image_path"),
        "ocr": mp.get("ocr", []),
        "yolo": mp.get("yolo", []),
        "corrected": r.human_payload,
        "changeLog": r.diff_json or [],
    }


@router.post("/visions/{image_id}/ocr")
def run_ocr(image_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from algo.lite_vision import run_ocr_lite

    r = db.get(PreannotationResult, image_id)
    if not r:
        raise HTTPException(404, "图像不存在")
    path = (r.meta_json or {}).get("image_path")
    if not path or not Path(path).exists():
        raise HTTPException(400, "请先上传图片（meta.image_path 无效）")
    out = run_ocr_lite(path)
    mp = dict(r.model_payload or {})
    mp["ocr"] = out.get("regions", [])
    mp["ocr_meta"] = {k: v for k, v in out.items() if k != "regions"}
    r.model_payload = mp
    r.status = "ocr_done"
    push_log(db, actor_id=user.id, actor_name=user.name, action="OCR 推理", detail=image_id)
    db.commit()
    return out


@router.post("/visions/{image_id}/yolo")
def run_yolo(image_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from algo.lite_vision import run_yolo_lite

    r = db.get(PreannotationResult, image_id)
    if not r:
        raise HTTPException(404, "图像不存在")
    path = (r.meta_json or {}).get("image_path")
    if not path or not Path(path).exists():
        raise HTTPException(400, "请先上传图片")
    out = run_yolo_lite(path)
    mp = dict(r.model_payload or {})
    mp["yolo"] = out.get("detections", [])
    mp["yolo_meta"] = {k: v for k, v in out.items() if k != "detections"}
    r.model_payload = mp
    r.status = "yolo_done"
    push_log(db, actor_id=user.id, actor_name=user.name, action="YOLO 推理", detail=image_id)
    db.commit()
    return out


@router.put("/visions/{image_id}/correction")
def correct_vision(image_id: str, body: CorrectionIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.get(PreannotationResult, image_id)
    if not r:
        raise HTTPException(404, "图像不存在")
    diff = list(r.diff_json or [])
    diff.append({"at": datetime.utcnow().isoformat(), "by": user.name, "human": body.payload})
    r.human_payload = body.payload
    r.diff_json = diff
    r.status = "corrected"
    db.commit()
    return {"ok": True}


class BindImageIn(BaseModel):
    imagePath: str
    title: str | None = None


@router.post("/visions")
def create_vision(body: BindImageIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rid = f"pre-vision-{uuid.uuid4().hex[:8]}"
    r = PreannotationResult(
        id=rid,
        title=body.title or rid,
        kind="vision",
        status="uploaded",
        model_payload={"ocr": [], "yolo": []},
        meta_json={"image_path": body.imagePath},
    )
    db.add(r)
    db.commit()
    return {"id": rid}
