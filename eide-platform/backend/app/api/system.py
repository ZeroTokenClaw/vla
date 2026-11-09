from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()


@router.get("/stats/dashboard")
def dashboard():
    """驾驶舱聚合占位；前端未接后端时仍用本地 analytics 服务。"""
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceMode": "real",
        "kpis": [
            {"key": "samples", "label": "标注任务", "value": 0},
            {"key": "passRate", "label": "审核通过率", "value": 0, "unit": "%"},
            {"key": "prelabel", "label": "预标吞吐", "value": 0},
            {"key": "vla", "label": "VLA 任务", "value": 0},
            {"key": "anomalies", "label": "异常计数", "value": 0},
            {"key": "training", "label": "训练中", "value": 0},
            {"key": "pendingReview", "label": "待审", "value": 0},
        ],
        "note": "P0 骨架：待业务表 seed 后返回真实聚合",
    }


@router.get("/projects")
def projects():
    return {
        "items": [
            {
                "id": "PRJ-EIDE-001",
                "name": "EIDE 演示项目",
                "code": "EIDE",
                "status": "active",
            }
        ],
        "total": 1,
        "page": 1,
        "pageSize": 20,
    }
