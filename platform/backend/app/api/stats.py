from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import (
    AnnotationTask,
    GpuResource,
    OperationLog,
    PreannotationResult,
    TrainingTask,
    User,
    VlaTask,
)

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return {
        "annotationTasks": db.query(AnnotationTask).count(),
        "annotationDone": db.query(AnnotationTask).filter(AnnotationTask.status == "done").count(),
        "vlaTasks": db.query(VlaTask).count(),
        "prelabelItems": db.query(PreannotationResult).count(),
        "trainingRunning": db.query(TrainingTask).filter(TrainingTask.status == "running").count(),
        "trainingTotal": db.query(TrainingTask).count(),
        "gpuFree": db.query(GpuResource).filter(GpuResource.free.is_(True)).count(),
        "gpuTotal": db.query(GpuResource).count(),
        "recentLogs": [
            {
                "id": log.id,
                "action": log.action,
                "detail": log.detail,
                "actor": log.actor_name,
                "at": log.created_at.isoformat(sep=" ", timespec="seconds") if log.created_at else None,
            }
            for log in db.query(OperationLog).order_by(OperationLog.created_at.desc()).limit(20)
        ],
    }
