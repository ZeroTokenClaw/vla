import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT))

from app.main import app  # noqa: E402
from algo.lite_nlp import annotate_text  # noqa: E402
from algo.lite_train import run_mini_train  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_login_and_qc(client):
    r = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    tasks = client.get("/api/v1/qc/tasks", headers=headers)
    assert tasks.status_code == 200
    assert "items" in tasks.json()


def test_nlp_varies_by_text():
    a = annotate_text("用户张某反映物流延误")
    b = annotate_text("申请退款售后处理")
    assert a["classification"]["label"] != b["classification"]["label"]
    assert any(e["type"] == "PERSON" for e in a["entities"])


def test_train_metrics_decrease():
    pts = run_mini_train(epochs=3, lr=0.05, seed=1)
    assert len(pts) == 3
    assert pts[-1]["train_loss"] <= pts[0]["train_loss"]
