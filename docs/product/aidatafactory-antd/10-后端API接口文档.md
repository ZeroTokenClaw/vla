# 《后端 API 接口文档》

> Base URL：`/api/v1`  
> 鉴权：`Authorization: Bearer <token>`  
> 原则：保持与 `vla-demo-antd/src/services/*` 方法语义对齐，新增 Factory 域。

---

## 1. 公共约定

| 项 | 说明 |
|----|------|
| 分页 | `page`, `pageSize` → `{ list, total, page, pageSize }` |
| 错误 | `{ code, message, detail? }` |
| 异步任务 | 返回 `{ jobId, status }`；查询 `GET /jobs/{jobId}` |
| 审计 | 写接口自动记 AuditLog |

---

## 2. 认证与用户

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/login` | 登录 |
| GET | `/auth/me` | 当前用户 |
| GET/POST/PATCH | `/users` | 用户管理 |
| GET/PUT | `/roles` | 角色权限 |

---

## 3. 生产任务与工作流（新增）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/factory/production-tasks` | 生产任务列表/创建 |
| GET/PATCH | `/factory/production-tasks/{id}` | 详情/更新 |
| POST | `/factory/production-tasks/{id}/run` | 启动 |
| POST | `/factory/production-tasks/{id}/retry` | 重试 |
| POST | `/factory/production-tasks/{id}/cancel` | 取消 |
| GET | `/factory/production-tasks/{id}/logs` | 日志 |
| GET/POST | `/factory/workflows` | 流程模板 |
| GET/PUT | `/factory/workflows/{id}` | 定义读写（含 nodes/edges） |
| POST | `/factory/workflows/{id}/publish` | 发布版本 |
| GET | `/factory/workflows/{id}/versions` | 版本列表 |
| GET | `/factory/executions` | 执行监控列表 |
| GET | `/factory/executions/{id}` | 执行详情+节点状态 |
| GET | `/ops/dashboard` | 驾驶舱聚合指标 |

---

## 4. QC（对齐 services/qc.js）

| Service 方法 | REST |
|--------------|------|
| `listQcTasks` | `GET /qc/tasks` |
| `getQcTask` | `GET /qc/tasks/{id}` |
| `createQcTask` | `POST /qc/tasks` |
| `assignTask` | `POST /qc/tasks/{id}/assign` |
| `transition` | `POST /qc/tasks/{id}/transition` |
| `addComment` | `POST /qc/tasks/{id}/comments` |
| `saveLabels` | `PUT /qc/tasks/{id}/labels` |
| 抽检规则 | `GET/PATCH /qc/sample-rules` |
| `runSampleCheck` | `POST /qc/sample-checks` |
| 抽检池动作 | `/qc/sample-pool/*` |
| `getSpecDoc` | `GET /qc/specs` |

---

## 5. Prelabel

| Service 方法 | REST |
|--------------|------|
| 文本列表/详情 | `GET /prelabel/texts` |
| `runTextPipeline` | `POST /prelabel/texts/{id}/run`（异步） |
| 视觉列表 | `GET /prelabel/visions` |
| `runOcr` / `runYolo` | `POST /prelabel/visions/{id}/ocr\|yolo` |
| `saveCorrection` | `PUT /prelabel/corrections/{id}` |
| 验收向导 | `/prelabel/accept-jobs*` |
| 批量任务 | `POST /prelabel/jobs`；`POST .../retry` |
| 模型注册 | `/models`；`/models/{id}/versions` |

---

## 6. VLA

| Service 方法 | REST |
|--------------|------|
| `listVlaTasks` / `getVlaTask` | `GET /vla/tasks` |
| `createCollectTask` | `POST /vla/tasks` |
| 场景/方案/模板 | `/vla/scenes` `/vla/plans` `/vla/action-templates` |
| 设备 | `/vla/devices` |
| `saveActionSpan` | `PUT /vla/tasks/{id}/actions` |
| 关键节点 | `PUT /vla/tasks/{id}/nodes` |
| 关系 | `PUT /vla/tasks/{id}/relations` |
| `detectIssues` | `POST /vla/tasks/{id}/detect`（异步） |
| issues 处理 | `POST /vla/tasks/{id}/issues/*` |
| `exportVla` | `POST /vla/tasks/{id}/export` → ExportTask |

---

## 7. Train

| Service 方法 | REST |
|--------------|------|
| 算法/模型元数据 | `GET /train/algorithms` `GET /train/models` |
| `listExperiments` | `GET /train/experiments` |
| `createExperiment` | `POST /train/experiments` |
| GPU | `GET /train/gpus`；`POST /train/experiments/{id}/gpus` |
| start/pause/resume/stop/retry | `POST /train/experiments/{id}/{action}` |
| metrics | `GET /train/experiments/{id}/metrics`（替代前端 tick） |
| logs | `GET /train/experiments/{id}/logs`（或 WS） |
| report | `GET /train/experiments/{id}/report?format=xlsx\|csv\|pdf` |

---

## 8. 数据集 / 文件 / 导出 / 审计

| 路径 | 说明 |
|------|------|
| `/datasets` | CRUD、版本、回流 |
| `/files/upload` | 直传或预签名 |
| `/export-tasks` | 导出中心 |
| `/audit-logs` | 系统日志中心 |
| `/notifications` | 消息通知 |

---

## 9. WebSocket

- `WS /ws/executions/{id}`：节点进度  
- `WS /ws/train/{id}`：epoch 指标与日志行  

---

## 10. 兼容策略

前端增加 `httpClient` adapter：`DEMO_MODE` 时仍调用现有 mock 实现；关闭后映射到本文件路径。  
删除工程模式下的 `tickEpoch` 客户端造数路径。
