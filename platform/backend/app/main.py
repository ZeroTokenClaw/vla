from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, files, prelabel, qc, stats, train, vla
from app.config import settings
from app.seed import seed_all

app = FastAPI(title=settings.app_name, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

prefix = settings.api_prefix
app.include_router(auth.router, prefix=prefix)
app.include_router(qc.router, prefix=prefix)
app.include_router(prelabel.router, prefix=prefix)
app.include_router(vla.router, prefix=prefix)
app.include_router(train.router, prefix=prefix)
app.include_router(files.router, prefix=prefix)
app.include_router(stats.router, prefix=prefix)


@app.on_event("startup")
def on_startup() -> None:
    seed_all()


@app.get("/health")
def health():
    return {"status": "ok", "algoMode": settings.algo_mode}
