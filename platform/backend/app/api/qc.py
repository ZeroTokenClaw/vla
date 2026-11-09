from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user, get_user_role_codes
from app.models import (
    AnnotationComment,
    AnnotationResult,
    AnnotationTask,
    QualityInspection,
    QualityRecord,
    QualityRule,
    ReviewHistory,
    User,
)
from app.services.audit import push_log

router = APIRouter(prefix="/qc", tags=["qc"])

TRANSITIONS = {
    "created": ["assigned"],
    "assigned": ["annotating"],
    "annotating": ["reviewing"],
    "reviewing": ["final_review", "rejected"],
    "final_review": ["done", "rejected"],
    "rejected": ["annotating"],
    "done": [],
}

MODALITIES = [
    {"value": "text_ner", "label": "文本实体抽取", "short": "文本NER"},
    {"value": "seg", "label": "图像语义分割", "short": "图像分割"},
    {"value": "audio_slice", "label": "语音切片", "short": "语音切片"},
    {"value": "video_det", "label": "视频目标检测", "short": "视频检测"},
    {"value": "point_seg", "label": "点云分割", "short": "点云分割"},
]

STATUS_FLOW = [
    {"value": "created", "label": "已创建"},
    {"value": "assigned", "label": "已分配"},
    {"value": "annotating", "label": "标注中"},
    {"value": "reviewing", "label": "初审中"},
    {"value": "final_review", "label": "终审中"},
    {"value": "done", "label": "已完成"},
    {"value": "rejected", "label": "已驳回"},
]


def _task_dict(t: AnnotationTask, comments: list | None = None, history: list | None = None) -> dict:
    return {
        "id": t.id,
        "title": t.title,
        "modality": t.modality,
        "status": t.status,
        "slaClass": t.priority,
        "assigneeId": t.assignee_id,
        "creatorId": t.creator_id,
        "collaborators": t.collaborators or [],
        "createdAt": t.created_at.isoformat(sep=" ", timespec="seconds") if t.created_at else None,
        "updatedAt": t.updated_at.isoformat(sep=" ", timespec="seconds") if t.updated_at else None,
        "sampleCount": t.sample_count,
        "doneCount": t.done_count,
        "labelsSnapshot": t.labels_snapshot or [],
        "resource": t.resource_json,
        "rejectReason": t.reject_reason,
        "reworkTrail": t.rework_trail or [],
        "comments": comments or [],
        "history": history or [],
    }


@router.get("/meta")
def meta(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return {
        "modalities": MODALITIES,
        "statuses": STATUS_FLOW,
        "users": [{"id": u.id, "name": u.name, "role": get_user_role_codes(db, u.id)[0] if get_user_role_codes(db, u.id) else ""} for u in users],
    }


@router.get("/tasks")
def list_tasks(
    page: int = 1,
    pageSize: int = 20,
    status: str | None = None,
    modality: str | None = None,
    keyword: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(AnnotationTask)
    if status:
        q = q.filter(AnnotationTask.status == status)
    if modality:
        q = q.filter(AnnotationTask.modality == modality)
    if keyword:
        like = f"%{keyword}%"
        q = q.filter((AnnotationTask.id.like(like)) | (AnnotationTask.title.like(like)))
    total = q.count()
    rows = q.order_by(AnnotationTask.created_at.desc()).offset((page - 1) * pageSize).limit(pageSize).all()
    return {"items": [_task_dict(t) for t in rows], "total": total, "page": page, "pageSize": pageSize}


@router.get("/tasks/{task_id}")
def get_task(task_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    t = db.get(AnnotationTask, task_id)
    if not t:
        raise HTTPException(404, "工单不存在")
    comments = (
        db.query(AnnotationComment).filter(AnnotationComment.task_id == task_id).order_by(AnnotationComment.created_at).all()
    )
    history = db.query(ReviewHistory).filter(ReviewHistory.task_id == task_id).order_by(ReviewHistory.created_at).all()
    return _task_dict(
        t,
        comments=[
            {
                "id": c.id,
                "at": c.created_at.isoformat(sep=" ", timespec="seconds"),
                "authorId": c.author_id,
                "authorName": c.author_name,
                "body": c.body,
            }
            for c in comments
        ],
        history=[
            {
                "at": h.created_at.isoformat(sep=" ", timespec="seconds"),
                "actor": h.actor_name,
                "action": f"{h.from_status} → {h.to_status}",
                "note": h.reason or "",
            }
            for h in history
        ],
    )


class CreateTaskIn(BaseModel):
    title: str
    modality: str = "text_ner"
    slaClass: str = "A"
    sampleCount: int = 1
    resource: dict | None = None


@router.post("/tasks")
def create_task(body: CreateTaskIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    tid = f"SC-{datetime.utcnow():%Y%m%d}-{uuid.uuid4().hex[:4].upper()}"
    labels = []
    resource = body.resource or {}
    for key in ("entities", "masks", "slices", "detections", "segments"):
        if key in resource:
            labels = resource[key]
            break
    t = AnnotationTask(
        id=tid,
        project_id="proj-sc-01",
        title=body.title,
        modality=body.modality,
        status="created",
        priority=body.slaClass,
        creator_id=user.id,
        sample_count=body.sampleCount,
        labels_snapshot=labels,
        resource_json=resource,
        collaborators=[],
        rework_trail=[],
    )
    db.add(t)
    db.add(
        ReviewHistory(
            id=f"rh-{uuid.uuid4().hex[:10]}",
            task_id=tid,
            from_status="-",
            to_status="created",
            actor_id=user.id,
            actor_name=user.name,
            reason="创建工单",
        )
    )
    push_log(db, actor_id=user.id, actor_name=user.name, action="创建质控工单", detail=tid)
    db.commit()
    return _task_dict(t)


class AssignIn(BaseModel):
    userId: str


@router.post("/tasks/{task_id}/assign")
def assign(task_id: str, body: AssignIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    t = db.get(AnnotationTask, task_id)
    if not t:
        raise HTTPException(404, "工单不存在")
    t.assignee_id = body.userId
    collab = list(t.collaborators or [])
    if body.userId not in collab:
        collab.append(body.userId)
    t.collaborators = collab
    if t.status == "created":
        _transition_record(db, t, "assigned", user, "分配人员")
        t.status = "assigned"
    t.updated_at = datetime.utcnow()
    push_log(db, actor_id=user.id, actor_name=user.name, action="分配工单", detail=f"{task_id} → {body.userId}")
    db.commit()
    return _task_dict(t)


class TransitionIn(BaseModel):
    toStatus: str
    note: str = ""
    rejectReason: str | None = None


@router.post("/tasks/{task_id}/transition")
def transition(task_id: str, body: TransitionIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    t = db.get(AnnotationTask, task_id)
    if not t:
        raise HTTPException(404, "工单不存在")
    allowed = TRANSITIONS.get(t.status, [])
    if body.toStatus not in allowed:
        raise HTTPException(400, f"不允许从 {t.status} 流转到 {body.toStatus}")
    roles = set(get_user_role_codes(db, user.id))
    if body.toStatus in ("done", "final_review", "rejected") and roles == {"annotator"}:
        raise HTTPException(403, "标注员无权执行该审核操作")
    if body.toStatus == "rejected" and not (body.rejectReason or body.note):
        raise HTTPException(400, "驳回必须填写原因")
    from_s = t.status
    t.status = body.toStatus
    if body.toStatus == "rejected":
        t.reject_reason = body.rejectReason or "other"
        trail = list(t.rework_trail or [])
        trail.append({"at": datetime.utcnow().isoformat(), "by": user.id, "code": t.reject_reason, "note": body.note})
        t.rework_trail = trail
    if body.toStatus == "done":
        t.done_count = t.sample_count
    _transition_record(db, t, body.toStatus, user, body.note or body.rejectReason or "", from_status=from_s)
    push_log(db, actor_id=user.id, actor_name=user.name, action="工单状态流转", detail=f"{task_id} {from_s}→{body.toStatus}")
    db.commit()
    return _task_dict(t)


def _transition_record(
    db: Session,
    t: AnnotationTask,
    to_status: str,
    user: User,
    reason: str,
    from_status: str | None = None,
) -> None:
    db.add(
        ReviewHistory(
            id=f"rh-{uuid.uuid4().hex[:10]}",
            task_id=t.id,
            from_status=from_status or t.status,
            to_status=to_status,
            actor_id=user.id,
            actor_name=user.name,
            reason=reason,
        )
    )


class CommentIn(BaseModel):
    body: str


@router.post("/tasks/{task_id}/comments")
def add_comment(task_id: str, body: CommentIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not body.body.strip():
        raise HTTPException(400, "批注不能为空")
    if not db.get(AnnotationTask, task_id):
        raise HTTPException(404, "工单不存在")
    c = AnnotationComment(
        id=f"c-{uuid.uuid4().hex[:10]}",
        task_id=task_id,
        author_id=user.id,
        author_name=user.name,
        body=body.body.strip(),
    )
    db.add(c)
    push_log(db, actor_id=user.id, actor_name=user.name, action="添加批注", detail=task_id)
    db.commit()
    return {"id": c.id, "body": c.body, "authorName": c.author_name}


class LabelsIn(BaseModel):
    labels: list = Field(default_factory=list)
    maskPath: str | None = None


@router.put("/tasks/{task_id}/labels")
def save_labels(task_id: str, body: LabelsIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    t = db.get(AnnotationTask, task_id)
    if not t:
        raise HTTPException(404, "工单不存在")
    t.labels_snapshot = body.labels
    t.updated_at = datetime.utcnow()
    db.add(
        AnnotationResult(
            id=f"ar-{uuid.uuid4().hex[:10]}",
            task_id=task_id,
            version=1,
            payload_json=body.labels,
            mask_path=body.maskPath,
            actor_id=user.id,
        )
    )
    push_log(db, actor_id=user.id, actor_name=user.name, action="保存标注", detail=task_id)
    db.commit()
    return _task_dict(t)


@router.get("/sample-rules")
def list_rules(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(QualityRule).all()
    return [{"id": r.id, "name": r.name, "ratio": r.ratio, "modalities": r.modalities_json or [], "threshold": r.threshold, "enabled": r.enabled} for r in rows]


class RulePatch(BaseModel):
    name: str | None = None
    ratio: float | None = None
    modalities: list[str] | None = None
    threshold: float | None = None
    enabled: bool | None = None


@router.patch("/sample-rules/{rule_id}")
def patch_rule(rule_id: str, body: RulePatch, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.get(QualityRule, rule_id)
    if not r:
        raise HTTPException(404, "规则不存在")
    if body.name is not None:
        r.name = body.name
    if body.ratio is not None:
        r.ratio = body.ratio
    if body.modalities is not None:
        r.modalities_json = body.modalities
    if body.threshold is not None:
        r.threshold = body.threshold
    if body.enabled is not None:
        r.enabled = body.enabled
    db.commit()
    return {"id": r.id, "name": r.name, "ratio": r.ratio, "modalities": r.modalities_json, "enabled": r.enabled}


@router.post("/sample-checks")
def run_check(ruleId: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rule = db.get(QualityRule, ruleId)
    if not rule or not rule.enabled:
        raise HTTPException(400, "规则不存在或未启用")
    tasks = db.query(AnnotationTask).filter(AnnotationTask.status.in_(["reviewing", "final_review", "done"])).all()
    import random

    n = max(1, int(len(tasks) * rule.ratio) or 1)
    picked = random.sample(tasks, min(n, len(tasks))) if tasks else []
    insp = QualityInspection(
        id=f"QI-{uuid.uuid4().hex[:8].upper()}",
        rule_id=rule.id,
        mode="random",
        status="done",
        result_json={"picked": [t.id for t in picked]},
    )
    db.add(insp)
    for t in picked:
        db.add(
            QualityRecord(
                id=f"qr-{uuid.uuid4().hex[:8]}",
                inspection_id=insp.id,
                sample_id=t.id,
                result="pending",
                reason=None,
            )
        )
    push_log(db, actor_id=user.id, actor_name=user.name, action="随机抽检", detail=insp.id)
    db.commit()
    return {"id": insp.id, "picked": [t.id for t in picked], "ruleName": rule.name}
