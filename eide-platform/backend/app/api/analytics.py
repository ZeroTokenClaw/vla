from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter

router = APIRouter()


@router.get("/analytics/profile")
def profile(dataset_id: Optional[str] = None):
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "datasetId": dataset_id,
        "modalityDistribution": [],
        "sceneDistribution": [],
        "labelCoverage": [],
        "missingRate": 0.0,
        "note": "P0 占位：接 sample 表后计算",
    }


@router.get("/analytics/quality-scores")
def quality_scores():
    return {
        "items": [],
        "ruleVersion": "EIDE-QR-1.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/analytics/anomalies")
def anomalies(issue_type: Optional[str] = None, status: Optional[str] = None):
    return {
        "items": [],
        "total": 0,
        "issueTypes": [
            {"key": "shake", "label": "抖动"},
            {"key": "occlusion", "label": "遮挡"},
            {"key": "blur", "label": "模糊"},
            {"key": "missing", "label": "缺失"},
            {"key": "mismatch", "label": "不匹配"},
        ],
        "filter": {"issue_type": issue_type, "status": status},
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
