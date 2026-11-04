# Orion Annotate（vla-demo-antd）

Vue3 + Vite + **Ant Design Vue** 演示前端，端口 **5102**。  
定位：国际 ToB SaaS 风（英文产品名 + 中英双语界面），与数联标注云（Element）功能对等、厂商感不同。

## 启动

```bash
cd E:\omp\vla\vla-demo-antd
pnpm install
pnpm dev
```

浏览器：http://127.0.0.1:5102

顶栏可切换 **Annotator / Reviewer / Admin**，并打开 **Activity** 审计抽屉。

## 厂商差异（相对 DataLink）

| 维度 | Orion Annotate |
|------|----------------|
| 产品名 | Orion Annotate / Orion Labs |
| 导航 | 顶栏横向 Menu + 中英模块名 |
| 首页 | Product Tour（Steps 勾选）+ Dataset 项目卡片 |
| 术语 | Job / Reviewer / Dataset 混排 |
| 反馈 | `notification` 右上角；Steps 带 checkmark |
| 空状态 | 如 `No jobs yet — Create job` |
| 任务前缀 | `ORN-` / `ORN-JOB-` / `ORN-VLA-` / `ORN-EXP-` |

## 模块路由

| 路径 | 模块 |
|------|------|
| `/` | Home 概览（Tour + 项目卡） |
| `/qc` | QC 质控 |
| `/qc/annotate/:id?` | Annotate 工作台 |
| `/qc/workflow` | Workflow 协作 |
| `/qc/audit/:id?` | Review 多级审核 |
| `/qc/sample-check` | Sampling 抽检回流 |
| `/qc/spec` | Spec 规范 |
| `/prelabel/text` | Text 文本预标 |
| `/prelabel/vision` | Vision OCR/YOLO |
| `/prelabel/accept` | Accept 验收向导 |
| `/vla/collect` | Collect 采集配置 |
| `/vla/timeline/:id?` | Timeline 标注 + 三格式导出 |
| `/vla/quality/:id?` | Quality 样本质检 |
| `/train/config` | Config 实验配置 |
| `/train/runner/:id?` | Runner 训练运行 |
| `/train/metrics/:id?` | Metrics 指标报表 |

## 评分点 → 菜单路径 → 演示要点

| 评分项 | 分值 | 菜单路径 | 演示要点 |
|--------|------|----------|----------|
| 1.(1) 多模态能力 | 1.5 | QC → Annotate | 五模态切换 + 真实样例 |
| 1.(2) 任务协作闭环 | 1.5 | Jobs → Workflow → Review | Create job / 分配 / 流转 / 驳回 |
| 1.(3) 抽检回流 | 1.0 | Sampling + Spec | 规则、随机抽检、回流 |
| 2.(1) 文本预标 | 1.5 | Prelabel → Text | 分类/NER/关系/结构化 + 修正 |
| 2.(2) 视觉预标 | 1.0 | Prelabel → Vision | OCR + YOLO + 修正 |
| 2.(3) 验收全流程 | 1.5 | Prelabel → Accept | Steps 勾选确认→标注→质检→验收 |
| 3.(1) 采集配置 | 2.5 | VLA → Collect | 场景/方案/模式/模板/人员 |
| 3.(2) 标注与导出 | 3.0 | Timeline | 联动浏览 + JSON/Excel/CSV |
| 3.(3) 样本质检 | 2.5 | Quality | 五类问题检测、标记过滤 |
| 4.(1) 训练配置 | 2.0 | Train → Config | 算法/版本/GPU |
| 4.(2) 运行与指标 | 2.0 | Runner + Metrics | 启停、曲线、报表导出 |

## 样例素材

同基准项目：`public/samples/`（视频/图/音频/点云预览）。

## 脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 开发服务 5102 |
| `pnpm build` | 生产构建 |
| `pnpm test` | Vitest |
| `pnpm preview` | 预览构建产物 |
