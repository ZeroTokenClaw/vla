# AI Data Factory（vla-demo-antd）

Vue3 + Vite + **Ant Design Vue** 演示前端，端口 **5102**。  
定位：以**自动化数据生产流水线**为核心的 AI Data Factory（逼真伪造数据，不接真实模型/后端）。

## 启动

```bash
cd E:\omp\vla\vla-demo-antd
pnpm install
pnpm dev
```

浏览器：http://127.0.0.1:5102

顶栏可切换 **Annotator / Reviewer / Admin**，并打开 **Activity** 审计抽屉。  
角标：`Demo · Fake Data`。

## 模块路由

| 路径 | 模块 |
|------|------|
| `/` | Home 概览 |
| `/factory/dashboard` | 数据生产驾驶舱 |
| `/factory/tasks` | 生产任务管理 |
| `/factory/workflows` | 自动化流程编排（16 节点） |
| `/factory/monitor` | 流程执行监控 |
| `/qc/*` | QC 质控（工单/标注/协作/审核/抽检） |
| `/prelabel/text\|ocr\|yolo\|accept\|jobs` | 预标注（含批量任务队列） |
| `/vla/collect\|scenes\|templates\|devices\|timeline\|quality\|exceptions` | VLA |
| `/train/config\|runner\|metrics\|gpus\|eval` | 训练 |
| `/analytics/profile\|quality\|anomaly` | 分析画像/评分/异常 |
| `/vla/action-analysis\|consistency` | 动作甘特 / 指令一致性 |
| `/system/models\|datasets\|export\|users\|logs` | 系统 |

详细页加深：标注工作台支持拖选实体/多边形/逐帧画框/点云旋转；采集含设备与质量字段；质检含证据抽屉与处理前后计数。

## 评分点 → 菜单路径 → 演示要点

| 评分项 | 分值 | 菜单路径 | 演示要点 |
|--------|------|----------|----------|
| 工厂差异化 | — | Factory | 建任务、编排、监控推进、节点日志 |
| 1.(1) 多模态能力 | 1.5 | QC → Annotate | 五模态切换 + 样例 |
| 1.(2) 任务协作闭环 | 1.5 | Jobs → Workflow → Review | 分配 / 流转 / 驳回 |
| 1.(3) 抽检回流 | 1.0 | Sampling + Spec | 规则、随机抽检、回流 |
| 2.(1) 文本预标 | 1.5 | Prelabel → Text | 分类/NER/关系 + 修正 |
| 2.(2) 视觉预标 | 1.0 | OCR / YOLO 中心 | 伪造推理 + 人工改框 |
| 2.(3) 验收全流程 | 1.5 | Prelabel → Accept | 确认→标注→质检→验收 |
| 3.(1) 采集配置 | 2.5 | VLA → Collect / 场景 / 模板 / 设备 | 全字段配置 |
| 3.(2) 标注与导出 | 3.0 | Timeline | 联动 + JSON/Excel/CSV |
| 3.(3) 样本质检 | 2.5 | Quality / 异常处理 | 五类问题、过滤前后对比 |
| 4.(1) 训练配置 | 2.0 | Train → Config / GPU | 算法/版本/GPU |
| 4.(2) 运行与指标 | 2.0 | Runner + Metrics + 评测 | 启停、曲线、报表 |

## 说明

- 本套为**页面级工程完善**：丰富伪造种子、可操作闭环、可下载导出。  
- **不**部署真实 OCR/YOLO/训练 Worker / 数据库。  
- 任务前缀：`ADF-PROD-` / `WF-ADF-` / 存量 `ORN-*`。

## 脚本

```bash
pnpm test
pnpm build
```
