# EIDE — 具身智能数据智能分析与模型评测平台

基线工程：`vla-demo-naive`（Vue3 + Vite + **Naive UI 深色**），端口 **5103**。  
产品文档：`../docs/product/eide-naive/`  
后端骨架：`../eide-platform/`（端口 **8103**）

定位：以**多模态数据画像、质量评分、智能预标注、VLA 行为理解、模型评测追溯**为核心，独立于数联工单流 / Orion 生产工厂 / 星算算力台。

## 启动

```bash
cd E:\omp\vla\vla-demo-naive
pnpm install
pnpm dev
```

浏览器：http://127.0.0.1:5103

可选后端：

```bash
cd E:\omp\vla\eide-platform\backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8103
```

## 信息架构（节选）

| 路径 | 模块 |
|------|------|
| `/` | 数据智能驾驶舱 |
| `/analytics/*` | 画像 / 质量评分 / 异常分析 |
| `/datasets` | 数据资产 |
| `/qc/*` | 多模态标注质控（兼容 annotate 别名） |
| `/prelabel/*` | 预标队列 / 文本 / 视觉 / 验收 |
| `/vla/*` | 采集 / **设备台账** / 场景 / 模板 / 联动 / 序列分析 / 一致性 / 质检 |
| `/train/*` | 训练配置 / 监控 / 报表 / **算力监控** |
| `/eval/*` `/lineage` | 模型注册 / 多模型对比（雷达+柱状+Case 矩阵+历史） / 血缘 |

任务前缀规划：`EIDE-` / `EA-` / `EP-` / `EV-` / `ET-`（存量种子仍可能为 `LM-`，迁移中）。

## 招标 20 分路径

见 `docs/product/eide-naive/11-招标20分功能覆盖矩阵.md`。

**本阶段策略**：用厚假数据完善详细页面与可写交互（筛选/抽屉/保存/对比图），**不接真实后端与算法**。训练指标仍为演示曲线；页面会标明演示假数据，不得对外表述为真实推理结果。

## 脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 开发服务 5103 |
| `pnpm build` | 生产构建 |
| `pnpm test` | Vitest |
