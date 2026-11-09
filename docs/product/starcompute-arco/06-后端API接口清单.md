# 《后端 API 接口清单》

> Base URL：`http://127.0.0.1:8000/api/v1`  
> 认证：`Authorization: Bearer <jwt>`  
> 约定：列表统一 `{ items, total, page, pageSize }`；错误 `{ detail }`  
> 设计原则：**保持与现有 `services/{qc,prelabel,vla,train}.js` 函数语义对齐**，降低前端改造成本。

---

## 1. 认证与系统

| Method | Path | 说明 |
|--------|------|------|
| POST | `/auth/login` | 登录，返回 token + user |
| GET | `/auth/me` | 当前用户 |
| GET | `/users` | 用户列表 |
| POST | `/users` | 创建用户（admin） |
| GET | `/roles` | 角色 |
| GET | `/projects` | 项目列表 |
| POST | `/projects` | 创建项目 |
| GET | `/datasets` | 数据集 |
| POST | `/datasets` | 创建数据集 |
| POST | `/files/upload` | 上传文件 → file_asset |
| GET | `/files/{id}/download` | 下载 |
| GET | `/logs` | 操作日志 |
| GET | `/stats/dashboard` | 驾驶舱聚合 |

---

## 2. 多模态标注 QC

| Method | Path | 对应前端 |
|--------|------|----------|
| GET | `/qc/meta` | `listMeta` |
| GET | `/qc/tasks` | `listQcTasks` |
| GET | `/qc/tasks/{id}` | `getQcTask` |
| POST | `/qc/tasks` | `createQcTask` |
| POST | `/qc/tasks/{id}/assign` | `assignTask` |
| POST | `/qc/tasks/{id}/claim` | 认领 |
| POST | `/qc/tasks/{id}/transition` | `transition` |
| POST | `/qc/tasks/{id}/comments` | `addComment` |
| PUT | `/qc/tasks/{id}/labels` | `saveLabels` |
| GET | `/qc/sample-rules` | `listSampleRules` |
| PATCH | `/qc/sample-rules/{id}` | `updateSampleRule` |
| POST | `/qc/sample-checks` | `runSampleCheck` |
| POST | `/qc/sample-checks/{id}/judge` | pass/reject |
| POST | `/qc/sample-checks/{id}/reflux` | `refluxPass` |
| GET | `/qc/specs` | 规范与标签体系 |

---

## 3. 预标注

| Method | Path | 说明 |
|--------|------|------|
| GET | `/prelabel/meta` | 实体/关系/类别字典 |
| GET | `/prelabel/texts` | 文本任务列表 |
| GET | `/prelabel/texts/{id}` | 详情 |
| POST | `/prelabel/texts/{id}/run` | 触发 NLP 推理（异步 job） |
| PUT | `/prelabel/texts/{id}/correction` | 人工修正 |
| GET | `/prelabel/visions` | 视觉列表 |
| POST | `/prelabel/visions/{id}/ocr` | OCR |
| POST | `/prelabel/visions/{id}/yolo` | YOLO |
| PUT | `/prelabel/visions/{id}/correction` | 修正 |
| GET | `/prelabel/accepts` | 验收单 |
| POST | `/prelabel/accepts/{id}/step` | 推进验收步骤 |
| GET | `/prelabel/jobs` | 批量任务队列 |
| POST | `/prelabel/jobs` | 创建批量预标 |
| POST | `/prelabel/jobs/{id}/retry` | 失败重试 |

异步任务状态：`GET /jobs/{id}` → `{ status, progress, result }`

---

## 4. VLA

| Method | Path | 说明 |
|--------|------|------|
| GET | `/vla/meta` | 场景/方案/模式/模板 |
| GET | `/vla/tasks` | 列表 |
| GET | `/vla/tasks/{id}` | 详情含 actions/nodes |
| POST | `/vla/tasks` | `createCollectTask` |
| PUT | `/vla/tasks/{id}/annotation` | 保存联动标注 |
| POST | `/vla/tasks/{id}/export` | body:`{formats:['json','excel','csv']}` |
| GET | `/vla/scenes` `/vla/plans` `/vla/templates` | CRUD |
| POST | `/vla/tasks/{id}/quality/run` | 触发质检 |
| GET | `/vla/tasks/{id}/quality` | 结果 |
| POST | `/vla/quality/{resultId}/review` | 人工复核 |
| POST | `/vla/tasks/{id}/filter` | 过滤不合格 |

---

## 5. 训练

| Method | Path | 说明 |
|--------|------|------|
| GET | `/train/meta` | 算法/模型/GPU |
| GET | `/train/experiments` | 列表 |
| GET | `/train/experiments/{id}` | 详情+metrics |
| POST | `/train/experiments` | 创建 |
| POST | `/train/experiments/{id}/start` | 启动 |
| POST | `/train/experiments/{id}/pause` | 暂停 |
| POST | `/train/experiments/{id}/resume` | 恢复 |
| POST | `/train/experiments/{id}/stop` | 终止 |
| POST | `/train/experiments/{id}/retry` | 重试 |
| GET | `/train/experiments/{id}/metrics` | 指标序列 |
| POST | `/train/experiments/{id}/export-report` | 报表 |
| GET | `/train/gpus` | GPU 列表与利用率 |
| POST | `/train/augment/preview` | 增强样例 |

WebSocket：`/ws/train/{id}` 推送 epoch 点。

---

## 6. 算法服务内部 API（Worker）

| Path | 说明 |
|------|------|
| POST `/internal/nlp/annotate` | 分类+NER+关系 |
| POST `/internal/ocr/run` | PaddleOCR |
| POST `/internal/yolo/detect` | YOLOv8 |
| POST `/internal/vla/quality` | 五类检测 |
| POST `/internal/train/run` | 启动训练子进程 |

仅内网调用，不暴露给浏览器。
