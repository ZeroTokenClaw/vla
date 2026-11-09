from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health():
    return {
        "status": "ok",
        "product": "EIDE",
        "port": 8103,
        "time": datetime.now(timezone.utc).isoformat(),
        "algo": {"mode": "not_connected", "services": []},
    }
