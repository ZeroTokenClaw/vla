# EIDE Platform（后端 + 算法）

配套前端：`../vla-demo-naive`（端口 5103）  
API 默认：`http://127.0.0.1:8103`

## 快速启动（P0 骨架）

```bash
cd eide-platform/backend
python -m venv .venv
# Windows:
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8103
```

健康检查：http://127.0.0.1:8103/health  
Swagger：http://127.0.0.1:8103/docs

## 目录

```
eide-platform/
  backend/app/     # FastAPI
  algo/            # 算法 runner（待建）
  worker/          # Celery（待建）
  storage/         # 媒体与产物
  models/          # 权重
```

产品设计文档：`../docs/product/eide-naive/`
