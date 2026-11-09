from __future__ import annotations

import csv
import sys
import threading
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal, get_db
from app.deps import get_current_user, get_user_role_codes
from app.models import GpuResource, TrainingConfig, TrainingMetrics, TrainingTask, User
from app.services.audit import push_log

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

router = APIRouter(prefix="/train", tags=["train"])

_STOP_FLAGS: dict[str, bool] = {}
_THREADS: dict[str, threading.Thread] = {}


def _exp_dict(t: TrainingTask, cfg: TrainingConfig | None = None, metrics: list | None = None) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "algorithm": t.algorithm,
        "version": t.version,
        "model": t.model,
        "status": t.status,
        "currentEpoch": t.current_epoch,
        "gpuIds": t.gpu_ids or [],
        "createdAt": t.created_at.isoformat(sep=" ", timespec="seconds") if t.created_at else None,
        "batchSize": cfg.batch_size if cfg else None,
        "learningRate": cfg.lr if cfg else None,
        "epochs": cfg.epochs if cfg else None,
        "augment": bool(cfg.augment_json) if cfg else False,
        "augmentOps": cfg.augment_json if cfg else [],
        "metrics": {
            "loss": [m.train_loss for m in (metrics or [])],
            "valLoss": [m.val_loss for m in (metrics or [])],
            "acc": [m.accuracy for m in (metrics or [])],
            "map": [m.map_value for m in (metrics or [])],
            "points": [
                {
                    "epoch": m.epoch,
                    "train_loss": m.train_loss,
                    "val_loss": m.val_loss,
                    "accuracy": m.accuracy,
                    "precision": m.precision,
                    "recall": m.recall,
                    "map_value": m.map_value,
                    "map_metric": m.map_metric,
                    "lr": m.lr,
                    "elapsed_sec": m.elapsed_sec,
                }
                for m in (metrics or [])
            ],
        },
    }


@router.get("/meta")
def meta(db: Session = Depends(get_db)):
    gpus = db.query(GpuResource).all()
    return {
        "algorithms": [
            {"value": "det_yolo", "label": "检测 YOLO 微调", "versions": ["v8.0", "v8.2"]},
            {"value": "vla_policy", "label": "VLA Policy", "versions": ["v1.0", "v1.3"]},
            {"value": "ner_bert", "label": "NER 微调", "versions": ["v1.0"]},
        ],
        "models": [
            {"value": "yolov8n", "label": "YOLOv8n", "algo": "det_yolo"},
            {"value": "yolov8m", "label": "YOLOv8m", "algo": "det_yolo"},
            {"value": "vla_act", "label": "ACT Policy", "algo": "vla_policy"},
        ],
        "gpus": [
            {
                "id": g.id,
                "name": g.name,
                "model": g.model,
                "memoryMb": g.memory_mb,
                "util": g.util,
                "free": g.free,
                "status": g.status,
            }
            for g in gpus
        ],
        "augmentOptions": ["flip", "rotate", "crop", "scale", "brightness", "contrast", "noise"],
    }


@router.get("/experiments")
def list_exp(page: int = 1, pageSize: int = 20, status: str | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(TrainingTask)
    if status:
        q = q.filter(TrainingTask.status == status)
    total = q.count()
    rows = q.order_by(TrainingTask.created_at.desc()).offset((page - 1) * pageSize).limit(pageSize).all()
    items = []
    for t in rows:
        cfg = db.query(TrainingConfig).filter(TrainingConfig.task_id == t.id).first()
        items.append(_exp_dict(t, cfg))
    return {"items": items, "total": total, "page": page, "pageSize": pageSize}


@router.get("/experiments/{exp_id}")
def get_exp(exp_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    t = db.get(TrainingTask, exp_id)
    if not t:
        raise HTTPException(404, "实验不存在")
    cfg = db.query(TrainingConfig).filter(TrainingConfig.task_id == exp_id).first()
    metrics = (
        db.query(TrainingMetrics).filter(TrainingMetrics.task_id == exp_id).order_by(TrainingMetrics.epoch).all()
    )
    return _exp_dict(t, cfg, metrics)


class CreateExpIn(BaseModel):
    name: str
    algorithm: str
    version: str = "v1"
    model: str
    batchSize: int = 8
    learningRate: float = 1e-3
    epochs: int = 5
    augment: bool = False
    augmentOps: list[str] = Field(default_factory=list)
    gpuIds: list[str] = Field(default_factory=list)


@router.post("/experiments")
def create_exp(body: CreateExpIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    roles = set(get_user_role_codes(db, user.id))
    if "admin" not in roles:
        raise HTTPException(403, "仅管理员可创建训练实验")
    eid = f"SC-EXP-{uuid.uuid4().hex[:6].upper()}"
    t = TrainingTask(
        id=eid,
        name=body.name,
        algorithm=body.algorithm,
        version=body.version,
        model=body.model,
        status="created",
        gpu_ids=body.gpuIds,
    )
    db.add(t)
    db.add(
        TrainingConfig(
            id=f"tc-{uuid.uuid4().hex[:8]}",
            task_id=eid,
            epochs=body.epochs,
            batch_size=body.batchSize,
            lr=body.learningRate,
            augment_json=body.augmentOps if body.augment else [],
            device="cuda" if any(g.startswith("gpu-") and g != "gpu-cpu" for g in body.gpuIds) else "cpu",
        )
    )
    for gid in body.gpuIds:
        g = db.get(GpuResource, gid)
        if g:
            g.free = False
            g.status = "allocated"
    push_log(db, actor_id=user.id, actor_name=user.name, action="创建训练实验", detail=eid)
    db.commit()
    return get_exp(eid, db, user)


def _run_train_job(exp_id: str) -> None:
    from algo.lite_train import run_mini_train

    db = SessionLocal()
    try:
        t = db.get(TrainingTask, exp_id)
        cfg = db.query(TrainingConfig).filter(TrainingConfig.task_id == exp_id).first()
        if not t or not cfg:
            return
        t.status = "running"
        db.commit()

        def on_epoch(point: dict) -> None:
            db2 = SessionLocal()
            try:
                task = db2.get(TrainingTask, exp_id)
                if not task:
                    return
                db2.add(
                    TrainingMetrics(
                        id=point["id"],
                        task_id=exp_id,
                        epoch=point["epoch"],
                        train_loss=point["train_loss"],
                        val_loss=point["val_loss"],
                        accuracy=point["accuracy"],
                        precision=point["precision"],
                        recall=point["recall"],
                        map_value=point["map_value"],
                        map_metric=point["map_metric"],
                        lr=point["lr"],
                        elapsed_sec=point["elapsed_sec"],
                    )
                )
                task.current_epoch = point["epoch"]
                task.updated_at = datetime.utcnow()
                db2.commit()
            finally:
                db2.close()

        run_mini_train(
            epochs=cfg.epochs,
            lr=cfg.lr,
            seed=abs(hash(exp_id)) % 10000,
            on_epoch=on_epoch,
            should_stop=lambda: _STOP_FLAGS.get(exp_id, False),
        )
        t = db.get(TrainingTask, exp_id)
        if t:
            t.status = "stopped" if _STOP_FLAGS.get(exp_id) else "finished"
            for gid in t.gpu_ids or []:
                g = db.get(GpuResource, gid)
                if g:
                    g.free = True
                    g.status = "free"
                    g.util = 0
            db.commit()
    finally:
        _STOP_FLAGS.pop(exp_id, None)
        db.close()


@router.post("/experiments/{exp_id}/start")
def start_exp(exp_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if "admin" not in set(get_user_role_codes(db, user.id)):
        raise HTTPException(403, "仅管理员可启动训练")
    t = db.get(TrainingTask, exp_id)
    if not t:
        raise HTTPException(404, "实验不存在")
    if t.status == "running":
        raise HTTPException(400, "已在运行")
    _STOP_FLAGS[exp_id] = False
    th = threading.Thread(target=_run_train_job, args=(exp_id,), daemon=True)
    _THREADS[exp_id] = th
    th.start()
    push_log(db, actor_id=user.id, actor_name=user.name, action="启动训练", detail=exp_id)
    db.commit()
    return {"ok": True, "status": "running"}


@router.post("/experiments/{exp_id}/stop")
def stop_exp(exp_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _STOP_FLAGS[exp_id] = True
    push_log(db, actor_id=user.id, actor_name=user.name, action="停止训练", detail=exp_id)
    db.commit()
    return {"ok": True}


@router.get("/experiments/{exp_id}/metrics")
def metrics(exp_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(TrainingMetrics).filter(TrainingMetrics.task_id == exp_id).order_by(TrainingMetrics.epoch).all()
    return [
        {
            "epoch": m.epoch,
            "train_loss": m.train_loss,
            "val_loss": m.val_loss,
            "accuracy": m.accuracy,
            "map_value": m.map_value,
            "map_metric": m.map_metric,
            "lr": m.lr,
            "elapsed_sec": m.elapsed_sec,
        }
        for m in rows
    ]


@router.post("/experiments/{exp_id}/export-report")
def export_report(exp_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    t = db.get(TrainingTask, exp_id)
    if not t:
        raise HTTPException(404, "实验不存在")
    rows = db.query(TrainingMetrics).filter(TrainingMetrics.task_id == exp_id).order_by(TrainingMetrics.epoch).all()
    out = settings.storage_dir / "exports" / f"{exp_id}-report.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["epoch", "train_loss", "val_loss", "accuracy", "map_value", "map_metric", "lr", "elapsed_sec"])
        for m in rows:
            w.writerow([m.epoch, m.train_loss, m.val_loss, m.accuracy, m.map_value, m.map_metric, m.lr, m.elapsed_sec])
    return {"path": str(out)}


@router.get("/gpus")
def list_gpus(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return [
        {"id": g.id, "name": g.name, "model": g.model, "memoryMb": g.memory_mb, "util": g.util, "free": g.free, "status": g.status}
        for g in db.query(GpuResource).all()
    ]


class AugmentIn(BaseModel):
    ops: list[str] = Field(default_factory=list)


@router.post("/augment/preview")
def augment_preview(body: AugmentIn, user: User = Depends(get_current_user)):
    # Return deterministic description of applied ops for UI preview contract.
    return {
        "ops": body.ops,
        "samples": [{"op": op, "preview": f"augmented:{op}"} for op in body.ops],
    }
