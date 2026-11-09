import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.models import OperationLog


def push_log(db: Session, *, actor_id: str | None, actor_name: str, action: str, detail: str = "") -> None:
    db.add(
        OperationLog(
            id=f"log-{uuid.uuid4().hex[:12]}",
            actor_id=actor_id,
            actor_name=actor_name,
            action=action,
            detail=detail,
            created_at=datetime.utcnow(),
        )
    )
