# VLA 四套异厂商演示系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `E:\omp\vla` 交付 4 个独立可运行的 Vue3 演示系统，功能覆盖全部评分点，观感与文案像四家不同厂商产品，便于用脱敏样例数据录制演示视频。

**Architecture:** 先实现 `vla-demo-element`（数联标注云）作为功能基准：统一 mock 服务、四大业务模块、导出与角色权限。再复制为 antd / naive / arco 三套，重做布局壳、文案字典、主题与首页，保留同等业务能力与评分点覆盖。无真实后端。

**Tech Stack:** Vue 3、Vite、Vue Router、Pinia、ECharts、xlsx（或 SheetJS）、pnpm；UI 分别为 Element Plus、Ant Design Vue、Naive UI、Arco Design。

**Spec:** `docs/superpowers/specs/2026-11-04-vla-four-style-demos-design.md`

## Global Constraints

- 路径根目录：`E:\omp\vla`
- 四项目目录名固定：`vla-demo-element`、`vla-demo-antd`、`vla-demo-naive`、`vla-demo-arco`
- 端口固定：5101 / 5102 / 5103 / 5104
- 每套功能完整覆盖评分四大模块；禁止只换主题色
- 数据：前端 mock + `public/samples/` 脱敏样例；service 延迟 300–1200ms
- VLA 导出必须可下载 JSON、Excel、CSV
- 角色：标注员 / 审核员 / 管理员，权限不同
- 任务号前缀分品牌：`DL-` / `ORN-` / `LM-` / `SC-`
- 包管理：pnpm；提交信息用英文 `feat:` / `docs:` 前缀
- 先做透 element 基准再分叉；分叉时必须独立 `src/i18n/copy.ts` 与不同首页/导航

## File map（基准项目 `vla-demo-element`）

```
vla-demo-element/
  package.json
  vite.config.js
  index.html
  README.md
  public/samples/          # images, video, audio, pointcloud preview
  src/main.js
  src/App.vue
  src/router/index.js
  src/stores/auth.js       # role switch
  src/stores/tasks.js
  src/i18n/copy.ts         # DataLink 文案
  src/mock/users.js
  src/mock/qc.js
  src/mock/prelabel.js
  src/mock/vla.js
  src/mock/train.js
  src/services/delay.js
  src/services/qc.js
  src/services/prelabel.js
  src/services/vla.js
  src/services/train.js
  src/utils/exportFiles.js # json/csv/xlsx
  src/layouts/MainLayout.vue
  src/views/Home.vue
  src/views/qc/*           # list, annotate, workflow, audit, sample-check
  src/views/prelabel/*
  src/views/vla/*
  src/views/train/*
  src/components/AuditLogDrawer.vue
  src/components/RoleSwitch.vue
  src/components/ProgressMock.vue
```

分叉项目复制后替换：`src/i18n/copy.ts`、`src/layouts/*`、`src/views/Home.vue`、主题入口、部分组件库写法；mock ID 前缀与产品名同步改写。

---

### Task 1: Scaffold DataLink（vla-demo-element）

**Files:**
- Create: `vla-demo-element/package.json`, `vite.config.js`, `index.html`, `src/main.js`, `src/App.vue`, `src/router/index.js`, `src/layouts/MainLayout.vue`, `src/views/Home.vue`, `src/i18n/copy.ts`, `README.md`

**Interfaces:**
- Produces: dev server on `http://127.0.0.1:5101`；路由占位 `/` `/qc` `/prelabel` `/vla` `/train`

- [ ] **Step 1: 创建 Vite Vue 项目并安装依赖**

```bash
cd E:\omp\vla
pnpm create vite vla-demo-element --template vue
cd vla-demo-element
pnpm install
pnpm add vue-router@4 pinia element-plus @element-plus/icons-vue echarts xlsx dayjs
pnpm add -D sass
```

- [ ] **Step 2: 配置端口与别名**

`vite.config.js`:

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { host: '127.0.0.1', port: 5101, strictPort: true },
})
```

- [ ] **Step 3: 写入 DataLink 文案字典与壳布局**

`src/i18n/copy.ts` 至少包含：`productName: '数联标注云 DataLink Label'`、模块名「质控中心 / 智能预标 / 具身采集标注 / 算法工场」、角色名。

`MainLayout.vue`：顶栏 Logo 字标 + 环境角标「演示」+ 侧栏四模块；首页 `Home.vue` 为「待办工单列表」风格（可先静态 3 条）。

- [ ] **Step 4: 启动验证**

```bash
cd E:\omp\vla\vla-demo-element
pnpm dev
```

Expected: 浏览器打开 5101，可见「数联标注云」与四模块侧栏。

- [ ] **Step 5: Commit**

```bash
cd E:\omp\vla
git add vla-demo-element
git commit -m "feat: scaffold DataLink demo on Element Plus port 5101"
```

---

### Task 2: Auth、delay、export 工具与 mock 骨架

**Files:**
- Create: `src/stores/auth.js`, `src/services/delay.js`, `src/utils/exportFiles.js`, `src/mock/users.js`, `src/components/RoleSwitch.vue`, `src/components/AuditLogDrawer.vue`
- Create: `src/utils/exportFiles.spec.js`（vitest）

**Interfaces:**
- Produces:
  - `useAuthStore()` → `{ role: 'annotator'|'reviewer'|'admin', user, setRole(role) }`
  - `delay(ms)` → Promise
  - `exportJSON(filename, data)`, `exportCSV(filename, rows)`, `exportExcel(filename, rows)`
  - `pushAudit({ action, detail })` 写入 pinia 或 provide 列表

- [ ] **Step 1: 安装 vitest 并写 export 失败测试**

```bash
pnpm add -D vitest
```

`src/utils/exportFiles.spec.js`:

```js
import { describe, it, expect } from 'vitest'
import { toCSV } from './exportFiles'

describe('toCSV', () => {
  it('joins header and rows', () => {
    const csv = toCSV([
      { id: 'DL-1', status: 'done' },
      { id: 'DL-2', status: 'reject' },
    ])
    expect(csv.split('\n')[0]).toContain('id')
    expect(csv).toContain('DL-1')
  })
})
```

`package.json` scripts 增加 `"test": "vitest run"`。

- [ ] **Step 2: 运行确认失败**

```bash
pnpm test
```

Expected: FAIL `toCSV` not exported / not defined.

- [ ] **Step 3: 实现 exportFiles、delay、auth、RoleSwitch**

`exportFiles.js` 导出 `toCSV`、`exportJSON`（Blob download）、`exportCSV`、`exportExcel`（xlsx `writeFile`）。  
`delay.js`: `export const delay = (ms) => new Promise((r) => setTimeout(r, ms))`  
默认业务延迟用 `delay(400 + Math.random()*400)`。

- [ ] **Step 4: 再跑测试**

```bash
pnpm test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add vla-demo-element
git commit -m "feat: add auth roles, delay helper, and export utils"
```

---

### Task 3: 质控模块（多模态标注 + 协作闭环 + 抽检回流）

**Files:**
- Create: `src/mock/qc.js`, `src/services/qc.js`
- Create: `src/views/qc/QcHub.vue`, `AnnotateWorkbench.vue`, `WorkflowBoard.vue`, `AuditPanel.vue`, `SampleCheck.vue`, `SpecDoc.vue`
- Modify: `src/router/index.js`

**Interfaces:**
- Consumes: `delay`, `useAuthStore`, `pushAudit`, copy 字典
- Produces: `listQcTasks()`, `createQcTask(payload)`, `assignTask(id, userId)`, `transition(id, toStatus, note?)`, `runSampleCheck(ruleId)`, `passSample(id)`, `rejectSample(id, reason)`, `refluxPass(ids[])`
- 状态机：`created → assigned → annotating → reviewing → final_review → done | rejected → annotating`

- [ ] **Step 1: mock 数据**

`qc.js` 至少含：5 条任务（前缀 `DL-2026-`）；模态类型枚举 `text_ner|seg|audio_slice|video_det|point_seg`；2 级审核记录；抽检规则 2 条；不合格原因枚举。

- [ ] **Step 2: AnnotateWorkbench**

三栏：左资源列表（切换 5 种模态，绑定 `public/samples/`）、中画布区（图片叠加框/文本高亮/音频切片时间轴简图/视频框/点云预览+结果表）、右标签与提交。提交走 `transition`，写审计日志。

- [ ] **Step 3: WorkflowBoard + AuditPanel**

看板列对齐状态机；批注线程；驳回必填原因；审核员可见「通过/驳回」，标注员不可终审。

- [ ] **Step 4: SampleCheck + SpecDoc**

规则配置（比例、模态）；随机抽检按钮带 ProgressMock；合格回流按钮更新列表状态。

- [ ] **Step 5: 手工验收（对照 4 分质控）**

打开 `/qc`，依次点：五模态标注 → 创建分配流转批注驳回多级审核 → 抽检通过/驳回/回流。  
Expected: 每步有状态变化与日志。

- [ ] **Step 6: Commit**

```bash
git add vla-demo-element
git commit -m "feat: DataLink QC multimodal annotate workflow and sample check"
```

---

### Task 4: 自动化预标注模块

**Files:**
- Create: `src/mock/prelabel.js`, `src/services/prelabel.js`
- Create: `src/views/prelabel/PrelabelHub.vue`, `TextPrelabel.vue`, `VisionPrelabel.vue`, `AcceptWizard.vue`

**Interfaces:**
- Produces: `runTextPipeline(docId)` → `{ classify, entities, relations, structured }`；`runOcr(imageId)`；`runYolo(imageId)`；`saveCorrection(id, patch)`；`acceptFlow` 步骤 `confirm → annotate → qa → accept`

- [ ] **Step 1: mock 预标注结果**

含可修正的错误实体/错误框，便于演示人工修正 Diff。

- [ ] **Step 2: TextPrelabel 三栏对照**

原始文本 | 模型 JSON | 人工编辑器；保存后高亮变更字段。

- [ ] **Step 3: VisionPrelabel**

OCR 文字层 + YOLO 框可拖改（至少支持改 label 与删除框）。

- [ ] **Step 4: AcceptWizard**

四步向导，每步确认后 `delay` + 步骤勾选；管理员/审核员可最终验收。

- [ ] **Step 5: 手工验收**

跑通文本 1.5 分路径、视觉 1 分路径、验收 1.5 分路径。

- [ ] **Step 6: Commit**

```bash
git add vla-demo-element
git commit -m "feat: DataLink auto prelabel text vision and acceptance wizard"
```

---

### Task 5: VLA 采集标注与样本质检 + 三格式导出

**Files:**
- Create: `src/mock/vla.js`, `src/services/vla.js`
- Create: `src/views/vla/VlaHub.vue`, `CollectConfig.vue`, `TimelineAnnotate.vue`, `QualityGate.vue`
- Modify: `src/utils/exportFiles.js`（若需专用 VLA schema）

**Interfaces:**
- Produces: `createCollectTask(config)`；`saveActionSpan({ taskId, startFrame, endFrame, action, instruction })`；`detectIssues(taskId)` → 抖动/遮挡/模糊/缺失/mismatch；`exportVla(taskId, format: 'json'|'excel'|'csv')`

- [ ] **Step 1: CollectConfig 表单**

字段：任务名、场景、方案、模式、动作模板多选、人员多选；保存生成 `DL-` 任务号。

- [ ] **Step 2: TimelineAnnotate**

上：任务头（指令文本+场景图）；中：`<video>` + 自定义时间轴打点起止帧；下：动作序列表。联动：点动作行跳转帧。

- [ ] **Step 3: 导出**

弹窗三按钮，分别触发 `exportJSON` / `exportExcel` / `exportCSV`，文件名 `DL-VLA-{taskId}-{timestamp}.{ext}`。

- [ ] **Step 4: QualityGate**

一键检测出 5 类问题样例；标记不合格；过滤开关隐藏不合格。

- [ ] **Step 5: 手工验收（8 分项）**

配置 → 联动标注 → 三格式各下载一次 → 质检过滤。

- [ ] **Step 6: Commit**

```bash
git add vla-demo-element
git commit -m "feat: DataLink VLA collect annotate export and quality gate"
```

---

### Task 6: 算法训练与验证模块

**Files:**
- Create: `src/mock/train.js`, `src/services/train.js`
- Create: `src/views/train/TrainHub.vue`, `AlgoConfig.vue`, `TrainRunner.vue`, `MetricsPanel.vue`

**Interfaces:**
- Produces: `createExperiment(cfg)`；`allocateGpu(expId, gpuIds[])`；`startTrain`/`stopTrain`；`getMetrics(expId)` → `{ loss[], acc[], map[] }`；`exportReport(expId, format)`

- [ ] **Step 1: AlgoConfig**

算法名、版本、模型、batch/lr/epoch、增强开关、GPU 多选（mock 卡名如 `NVIDIA A100-0`）。

- [ ] **Step 2: TrainRunner**

启停按钮；运行中用定时器推进 mock epoch，写日志。

- [ ] **Step 3: MetricsPanel**

ECharts 三曲线；结束后可导出报表 CSV/Excel。

- [ ] **Step 4: 权限**

仅管理员可分配 GPU 与创建实验；标注员只读指标。

- [ ] **Step 5: 手工验收（4 分项）**

- [ ] **Step 6: Commit**

```bash
git add vla-demo-element
git commit -m "feat: DataLink training config runner and metrics export"
```

---

### Task 7: DataLink 真实感补强与录屏脚本

**Files:**
- Create: `public/samples/*`（至少：1 图、1 短视频、1 音频或波形图、1 点云预览图）
- Create: `README.md` 完善；`docs/record-script-datalink.md`
- Modify: 全局审计抽屉、空状态、表单校验失败态

- [ ] **Step 1: 放入样例媒体**（可用现有 `E:\omp\VLA-Training-Platform\action_videos` 中脱敏短片复制，或占位图+说明）

- [ ] **Step 2: README 评分点对照表 + 录屏脚本**（逐步点击路径）

- [ ] **Step 3: 按脚本走查全部分**

- [ ] **Step 4: Commit**

```bash
git add vla-demo-element
git commit -m "docs: DataLink sample assets and recording checklist"
```

---

### Task 8: 分叉 Orion Annotate（Ant Design Vue）

**Files:**
- Create: 整个 `vla-demo-antd/`（从 element 复制后改造）

**Interfaces:**
- 能力与 Task 3–6 对等；文案/路由标题/任务前缀 `ORN-`；端口 5102

- [ ] **Step 1: 复制项目并换依赖**

```bash
cd E:\omp\vla
xcopy vla-demo-element vla-demo-antd\ /E /I /H
cd vla-demo-antd
pnpm remove element-plus @element-plus/icons-vue
pnpm add ant-design-vue @ant-design/icons-vue
```

改 `vite.config.js` port `5102`；`package.json` name。

- [ ] **Step 2: 重写壳与文案**

`copy.ts`：`productName: 'Orion Annotate'`；首页改为 Tour + 项目卡片；导航顶栏 Module 中英；术语 Job/Reviewer/Dataset。  
将 Element 组件替换为 Ant Design Vue 等价物（Layout、Table、Steps、Drawer、message → notification）。

- [ ] **Step 3: mock ID 前缀改为 `ORN-`**

- [ ] **Step 4: `pnpm dev` 按同一评分脚本走查**

- [ ] **Step 5: Commit**

```bash
git add vla-demo-antd
git commit -m "feat: add Orion Annotate demo on Ant Design Vue"
```

---

### Task 9: 分叉灵眸 VLA Studio（Naive UI）

**Files:**
- Create: `vla-demo-naive/`

- [ ] **Step 1: 复制并换 Naive UI，端口 5103**

```bash
pnpm remove ant-design-vue @ant-design/icons-vue
pnpm add naive-ui vueuc
```

（若从 element 复制则 remove element-plus 后装 naive-ui。）

- [ ] **Step 2: 深色主题 + 时间轴优先首页**（最近采集会话）；图标主导航；底部 Console 日志；前缀 `LM-`

- [ ] **Step 3: 走查 + Commit**

```bash
git commit -m "feat: add Lingmou VLA Studio demo on Naive UI"
```

---

### Task 10: 分叉星算训练台（Arco Design）

**Files:**
- Create: `vla-demo-arco/`

- [ ] **Step 1: 复制并换 Arco，端口 5104**

```bash
pnpm add @arco-design/web-vue
```

- [ ] **Step 2: 仪表盘首页（GPU/实验总览）；卡片宫格进模块；术语实验/算力池/Checkpoint；前缀 `SC-`

- [ ] **Step 3: 走查 + Commit**

```bash
git commit -m "feat: add StarCompute training console demo on Arco Design"
```

---

### Task 11: 总验收与根 README

**Files:**
- Create: `E:\omp\vla\README.md`
- Create: `docs/superpowers/plans/acceptance-checklist.md`

- [ ] **Step 1: 根 README 写明四套启动命令与人设差异说明**

- [ ] **Step 2: 验收清单**（四产品名 3 秒可辨；评分点全覆盖；三导出；权限差；非换皮）

- [ ] **Step 3: 四端口同时或分别启动冒烟**

```bash
# 四个终端分别
pnpm --dir vla-demo-element dev
pnpm --dir vla-demo-antd dev
pnpm --dir vla-demo-naive dev
pnpm --dir vla-demo-arco dev
```

- [ ] **Step 4: Commit**

```bash
git add README.md docs
git commit -m "docs: root README and four-demo acceptance checklist"
```

---

## Spec coverage check

| Spec 项 | Task |
|---|---|
| 4 独立项目 + 端口 | 1,8,9,10 |
| 异厂商人设/文案/首页 | 1,7,8,9,10 |
| 质控 4 分 | 3 |
| 预标注 4 分 | 4 |
| VLA 8 分含三导出 | 5 |
| 训练 4 分 | 6 |
| mock 延迟/样例/审计/权限 | 2,7 |
| 录屏与验收 | 7,11 |

## Placeholder / 一致性

- 状态机与角色枚举以 Task 2–3 为准，分叉不得改状态名，只改展示文案。  
- 导出函数名统一 `exportJSON` / `exportCSV` / `exportExcel`。  
- 无 TBD 步骤；媒体缺失时用明确占位文件名并在 Task 7 补齐。
