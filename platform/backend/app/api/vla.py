from __future__ import annotations

import csv
import json
import sys
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from openpyxl import Workbook
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.deps import get_current_user
from app.models import (
    ActionTemplate,
    CollectionPlan,
    ExportTask,
    ModalityRelation,
    User,
    VlaQualityResult,
    VlaQualityTask,
    VlaScene,
    VlaTask,
)
from app.services.audit import push_log

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

router = APIRouter(prefix="/vla", tags=["vla"])


def _task_brief(t: VlaTask) -> dict:
    ann = t.annotation_json or {}
    return {
        "id": t.id,
        "name": t.name,
        "scene": t.scene,
        "plan": t.plan,
        "mode": t.mode,
        "status": t.status,
        "createdAt": t.created_at.isoformat(sep=" ", timespec="seconds") if t.created_at else None,
        "durationSec": t.duration_sec,
        "totalFrames": t.total_frames,
        "videoUrl": t.video_url,
        "imageUrl": t.image_url,
        "actionCount": len(ann.get("actions") or []),
        "issueCount": len(t.issues_json or []),
        "issuesDetected": t.issues_detected,
        "personnelIds": t.personnel_ids or [],
        "instruction": t.instruction,
    }


@router.get("/meta")
def meta(db: Session = Depends(get_db)):
    return {
        "scenes": [{"id": s.id, "name": s.name, "category": s.category} for s in db.query(VlaScene).all()],
        "plans": [{"id": p.id, "name": p.name} for p in db.query(CollectionPlan).all()],
        "actionTemplates": [{"id": a.id, "name": a.name, "type": a.type} for a in db.query(ActionTemplate).all()],
        "modes": [
            {"value": "video", "label": "视频采集"},
            {"value": "image", "label": "图像采集"},
            {"value": "demo_teleop", "label": "人工示范采集"},
            {"value": "multimodal_sync", "label": "多模态同步采集"},
            {"value": "robot_exec", "label": "机器人执行采集"},
        ],
        "issueTypes": ["shake", "occlusion", "blur", "missing", "mismatch"],
    }


@router.get("/tasks")
def list_tasks(page: int = 1, pageSize: int = 20, status: str | None = None, keyword: str | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(VlaTask)
    if status:
        q = q.filter(VlaTask.status == status)
    if keyword:
        like = f"%{keyword}%"
        q = q.filter((VlaTask.id.like(like)) | (VlaTask.name.like(like)))
    total = q.count()
    rows = q.order_by(VlaTask.created_at.desc()).offset((page - 1) * pageSize).limit(pageSize).all()
    return {"items": [_task_brief(t) for t in rows], "total": total, "page": page, "pageSize": pageSize}


@router.get("/tasks/{task_id}")
def get_task(task_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    t = db.get(VlaTask, task_id)
    if not t:
        raise HTTPException(404, "采集任务不存在")
    data = _task_brief(t)
    data.update(
        {
            "annotation": t.annotation_json or {},
            "issues": t.issues_json or [],
            "filteredOut": t.filtered_out or [],
            "robotModel": t.robot_model,
            "deviceNo": t.device_no,
            "actionTemplateIds": t.action_template_ids or [],
        }
    )
    return data


class CreateVlaIn(BaseModel):
    name: str
    scene: str
    plan: str
    mode: str
    actionTemplateIds: list[str] = Field(default_factory=list)
    personnelIds: list[str] = Field(default_factory=list)
    instruction: str = ""
    robotModel: str = ""
    deviceNo: str = ""
    videoUrl: str | None = None
    imageUrl: str | None = None


@router.post("/tasks")
def create_task(body: CreateVlaIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not body.name.strip():
        raise HTTPException(400, "请填写任务名称")
    tid = f"SC-VLA-{uuid.uuid4().hex[:6].upper()}"
    t = VlaTask(
        id=tid,
        project_id="proj-sc-01",
        name=body.name.strip(),
        scene=body.scene,
        plan=body.plan,
        mode=body.mode,
        instruction=body.instruction or "请完成指定操作",
        robot_model=body.robotModel,
        device_no=body.deviceNo,
        status="created",
        personnel_ids=body.personnelIds,
        action_template_ids=body.actionTemplateIds,
        video_url=body.videoUrl,
        image_url=body.imageUrl,
        annotation_json={"actions": [], "nodes": []},
        issues_json=[],
        filtered_out=[],
    )
    db.add(t)
    push_log(db, actor_id=user.id, actor_name=user.name, action="创建 VLA 采集任务", detail=tid)
    db.commit()
    return _task_brief(t)


class AnnIn(BaseModel):
    instruction: str | None = None
    actions: list = Field(default_factory=list)
    nodes: list = Field(default_factory=list)


@router.put("/tasks/{task_id}/annotation")
def save_ann(task_id: str, body: AnnIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    t = db.get(VlaTask, task_id)
    if not t:
        raise HTTPException(404, "任务不存在")
    if body.instruction is not None:
        t.instruction = body.instruction
    t.annotation_json = {"actions": body.actions, "nodes": body.nodes}
    t.status = "annotating"
    t.updated_at = datetime.utcnow()
    # persist modality relations
    sample_id = f"sample-{task_id}"
    for node in body.nodes:
        db.add(
            ModalityRelation(
                id=f"mr-{uuid.uuid4().hex[:10]}",
                sample_id=sample_id,
                text_ref=body.instruction or t.instruction,
                instruction=body.instruction or t.instruction,
                node_id=str(node.get("id")),
                timestamp=float(node.get("timestamp") or 0),
            )
        )
    push_log(db, actor_id=user.id, actor_name=user.name, action="保存 VLA 标注", detail=task_id)
    db.commit()
    return get_task(task_id, db, user)


class ExportIn(BaseModel):
    formats: list[str] = Field(default_factory=lambda: ["json", "excel", "csv"])


@router.post("/tasks/{task_id}/export")
def export_task(task_id: str, body: ExportIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    t = db.get(VlaTask, task_id)
    if not t:
        raise HTTPException(404, "任务不存在")
    ann = t.annotation_json or {}
    sample_id = f"sample-{task_id}"
    payload = {
        "taskId": t.id,
        "sampleId": sample_id,
        "name": t.name,
        "instruction": t.instruction,
        "scene": t.scene,
        "plan": t.plan,
        "mode": t.mode,
        "videoUrl": t.video_url,
        "imageUrl": t.image_url,
        "actions": ann.get("actions") or [],
        "nodes": ann.get("nodes") or [],
        "exportedAt": datetime.utcnow().isoformat(),
    }
    out_dir = settings.storage_dir / "exports" / task_id
    out_dir.mkdir(parents=True, exist_ok=True)
    files = {}
    if "json" in body.formats:
        p = out_dir / f"{task_id}.json"
        p.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        files["json"] = str(p)
        _record_export(db, user, task_id, "json", str(p))
    rows = []
    for a in ann.get("actions") or []:
        rows.append(
            {
                "taskId": t.id,
                "sampleId": sample_id,
                "type": "action",
                "name": a.get("type"),
                "start": a.get("start"),
                "end": a.get("end"),
                "startFrame": a.get("startFrame"),
                "endFrame": a.get("endFrame"),
                "desc": a.get("desc"),
                "instruction": t.instruction,
            }
        )
    for n in ann.get("nodes") or []:
        rows.append(
            {
                "taskId": t.id,
                "sampleId": sample_id,
                "type": "node",
                "name": n.get("name"),
                "start": n.get("timestamp"),
                "end": "",
                "startFrame": n.get("frame"),
                "endFrame": "",
                "desc": n.get("type"),
                "instruction": t.instruction,
            }
        )
    if not rows:
        rows = [{"taskId": t.id, "sampleId": sample_id, "type": "task", "name": t.name, "instruction": t.instruction}]
    if "csv" in body.formats:
        p = out_dir / f"{task_id}.csv"
        with p.open("w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
        files["csv"] = str(p)
        _record_export(db, user, task_id, "csv", str(p))
    if "excel" in body.formats:
        p = out_dir / f"{task_id}.xlsx"
        wb = Workbook()
        ws = wb.active
        ws.title = "VLA"
        headers = list(rows[0].keys())
        ws.append(headers)
        for row in rows:
            ws.append([row.get(h) for h in headers])
        wb.save(p)
        files["excel"] = str(p)
        _record_export(db, user, task_id, "excel", str(p))
    push_log(db, actor_id=user.id, actor_name=user.name, action="VLA 导出", detail=f"{task_id} {list(files)}")
    db.commit()
    return {"files": files, "downloadBase": f"/api/v1/vla/exports/{task_id}"}


def _record_export(db: Session, user: User, biz_id: str, fmt: str, path: str) -> None:
    db.add(
        ExportTask(
            id=f"exp-{uuid.uuid4().hex[:10]}",
            biz_type="vla",
            biz_id=biz_id,
            format=fmt,
            path=path,
            status="done",
            actor_id=user.id,
        )
    )


@router.get("/exports/{task_id}/{fmt}")
def download_export(task_id: str, fmt: str, user: User = Depends(get_current_user)):
    ext = {"json": "json", "csv": "csv", "excel": "xlsx"}.get(fmt)
    if not ext:
        raise HTTPException(400, "格式无效")
    path = settings.storage_dir / "exports" / task_id / f"{task_id}.{ext}"
    if not path.exists():
        raise HTTPException(404, "文件不存在，请先导出")
    return FileResponse(path, filename=path.name)


@router.post("/tasks/{task_id}/quality/run")
def run_quality(task_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from algo.lite_vla_quality import run_quality as rq

    t = db.get(VlaTask, task_id)
    if not t:
        raise HTTPException(404, "任务不存在")
    ann = t.annotation_json or {}
    meta = {
        "instruction": t.instruction,
        "actions": ann.get("actions") or [],
        "nodes": ann.get("nodes") or [],
        "video_url": t.video_url,
    }
    video_path = None
    if t.video_url:
        # resolve local storage or relative path
        cand = Path(t.video_url)
        if cand.exists():
            video_path = str(cand)
        else:
            alt = settings.storage_dir / "uploads" / Path(t.video_url).name
            if alt.exists():
                video_path = str(alt)
    issues = rq(video_path, meta)
    qt = VlaQualityTask(
        id=f"vq-{uuid.uuid4().hex[:8]}",
        vla_task_id=task_id,
        status="done",
        detectors_json=["shake", "occlusion", "blur", "missing", "mismatch"],
    )
    db.add(qt)
    stored = []
    for iss in issues:
        rid = f"vqr-{uuid.uuid4().hex[:8]}"
        db.add(
            VlaQualityResult(
                id=rid,
                quality_task_id=qt.id,
                sample_id=f"sample-{task_id}",
                issue_type=iss["issue_type"],
                severity=iss.get("severity", "medium"),
                location_json=iss.get("location") or {},
                message=iss.get("message", ""),
            )
        )
        stored.append({**iss, "id": rid})
    t.issues_json = stored
    t.issues_detected = True
    push_log(db, actor_id=user.id, actor_name=user.name, action="VLA 质量检测", detail=f"{task_id} · {len(stored)} issues")
    db.commit()
    return {"taskId": task_id, "issues": stored}


class ReviewIn(BaseModel):
    decision: str  # keep | reject
    note: str = ""


@router.post("/quality/{result_id}/review")
def review_issue(result_id: str, body: ReviewIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.get(VlaQualityResult, result_id)
    if not r:
        raise HTTPException(404, "结果不存在")
    r.reviewed = True
    r.review_decision = body.decision
    db.commit()
    return {"ok": True}


class FilterIn(BaseModel):
    issueIds: list[str] = Field(default_factory=list)


@router.post("/tasks/{task_id}/filter")
def filter_bad(task_id: str, body: FilterIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    t = db.get(VlaTask, task_id)
    if not t:
        raise HTTPException(404, "任务不存在")
    t.filtered_out = body.issueIds
    t.status = "filtered"
    db.commit()
    return _task_brief(t)
