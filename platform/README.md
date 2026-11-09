# StarCompute Platform（星算后端）

独立「多模态 AI 数据标注与 VLA 智能训练平台」服务端。

## 目录

```
platform/
  backend/     FastAPI + SQLAlchemy
  algo/        推理与质检实现（lite / full）
  workers/     Celery 任务（可选）
  storage/     上传文件、mask、权重、导出物
```

## 快速启动（演示）

```bash
cd E:\omp\vla\platform\backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- API 文档：http://127.0.0.1:8000/docs  
- 默认账号：`admin` / `admin123`（角色 admin）  
- 数据库：默认 `platform/storage/starcompute.db`（SQLite）

前端对接：在 `vla-demo-arco` 设置环境变量

```
VITE_API_BASE=http://127.0.0.1:8000/api/v1
```

未设置时前端仍走本地 mock，保证演示可回退。

## 算法模式

- `ALGO_MODE=lite`（默认）：OpenCV/规则处理真实文件，写真实结果  
- `ALGO_MODE=full`：加载 YOLO / PaddleOCR / transformers（需额外依赖与权重）
