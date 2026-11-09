"""EIDE API — 具身智能数据智能分析与模型评测平台后端入口。"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analytics, auth, health, system

app = FastAPI(
    title="EIDE API",
    description="Embodied Intelligence Data & Evaluation Platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5103",
        "http://localhost:5103",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(system.router, prefix="/api/v1", tags=["system"])
app.include_router(analytics.router, prefix="/api/v1", tags=["analytics"])


@app.on_event("startup")
def on_startup() -> None:
    # 后续：create_all / alembic / seed
    pass


@app.get("/")
def root():
    return {
        "product": "EIDE",
        "service": "eide-platform",
        "time": datetime.now(timezone.utc).isoformat(),
        "docs": "/docs",
    }
