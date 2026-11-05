# VLA 四套演示 · 生产感样例数据加厚 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有四套 Vue mock 演示上，按域把 QC / 预标注 / VLA / 训练加厚到每域 ≥50 条可列表记录，接上分页与筛选，生成各套独立脱敏媒体，并拉开异厂商字段，支撑偏生产感录屏。

**Architecture:** 方案 A — 每应用独立 `src/mock/seed/`（固定 PRNG seed，刷新可复现）产出厚数据；现有 `src/mock/*.js` 保留手写「故意错标 / 驳回链 / Diff」展示行并与 seed 合并；`src/services/*` 的 list API 统一改为 `{ items, total, page, pageSize }`；列表页接分页控件。媒体由本机脚本写入各 `public/samples/`（内容哈希互异）。四套 **不共用** 同一 seed 源文件。

**Tech Stack:** Vue 3、Vite、Pinia、vitest、pnpm；UI 仍为 Element Plus / Ant Design Vue / Naive UI / Arco Design；媒体生成用本机已有 `ffmpeg` + Node（或 Python）合成脱敏 jpg/wav/mp4。

**Spec:** `docs/superpowers/specs/2026-11-04-vla-demo-data-enrichment-design.md`

## Global Constraints

- 仓库根：`E:\omp\vla`；分支：`feature/vla-four-vendor-demos`（本计划不改主分支策略）
- 四目录：`vla-demo-element` / `vla-demo-antd` / `vla-demo-naive` / `vla-demo-arco`
- 端口：5101 / 5102 / 5103 / 5104
- **不接**真实后端 / DB / 对象存储；仍用内存 mock + 本地 `/samples/...` URL
- **不缩减**既有评分点功能面；只加厚数据与列表交互
- 每域核心列表实体 **≥50**；VLA **episode ≥50**；训练 **实验 ≥50**
- list 非法 / 越界页码 **回落到第 1 页**；筛选无命中 `total === 0` 空列表
- Seed 抛错 → 回退现有薄种子，`console.error`，应用仍可登录
- 媒体缺失 → UI 占位 + console/logger 警告
- ID 前缀：`DL` / `ORN` / `LM` / `SC`（及既有 `u-dl-` / `u-orn-` / `u-lm-` / `u-sc-`）
- 核心流转 `status` / `modality` **value 键四套保持一致**（避免打爆 `TRANSITIONS` 与既有评分点用例）；异厂商差异强制落在：priority 等价字段名与枚举、组织维度字段名、轨迹 / 训练 JSON 键名、场景 value、文案、seed 常数
- 包管理：pnpm；提交英文 `feat:` / `test:` / `docs:`；**本计划文件单独提交，不 push**
- 手写展示行 ID 必须保留（测试硬编码）：如 `DL-VLA-2026-001`、`DL-TXT-2026-001`、`DL-ACC-2026-003`、`DL-EXP-2026-001` 及各套对应前缀

## Vendor field matrix（实现时必须按列落地，禁止抄成四套同名）

| 关注点 | Element 数联 | Antd Orion | Naive 灵眸 | Arco 星算 |
|--------|--------------|------------|------------|-----------|
| PRNG 常数 | `0xD11A7E01` | `0x02A10D01` | `0x11A10E01` | `0x5C010001` |
| QC 优先级字段 | `priority`: `high`/`medium`/`low` | `severity`: `P0`/`P1`/`P2` | `urgency`: `urgent`/`normal`/`backlog` | `slaClass`: `S`/`A`/`B` |
| 组织维度（users） | `dept` | `team` | `squad` | `pool` |
| QC 附加维度 | `buCode`（事业部） | `workspace` | `lane` | `tenantCode` |
| VLA 场景 value | `kitchen_counter`/`lab_bench`/`warehouse_bin`/`office_desk` | `aisle_pick`/`cold_lab`/`mezzanine`/`lobby_desk` | `stove_top`/`clean_bench`/`tote_wall`/`dual_monitor` | `pack_station`/`chem_hood`/`sku_cage`/`sit_stand` |
| 轨迹 JSON | `trajectory.{joints,gripper,tSec}` | `telem.{qpos,grip,tsMs}` | `signal.{dof,claw,t}` | `stream.{joints,eeOpen,stamp}` |
| 训练数据集 | `datasets[]` + `split`/`versionPin` | `catalog[]` + `fold`/`rev` | `corpora[]` + `part`/`tag` | `repos[]` + `partition`/`pin` |
| Checkpoint | `checkpoints[]` | `ckptList[]` | `snapshots[]` | `weights[]` |
| 验证表 | `valTable` | `evalGrid` | `scoreSheet` | `evalSheet` |
| 混淆矩阵 | `confusionMatrix` | `cmMatrix` | `mixMatrix` | `errorGrid` |
| 日志字段 | `logs[]` | `runLog[]` | `consoleLines[]` | `trainLog[]` |

## File map（每套各一份，禁止跨应用 import seed）

```
vla-demo-{element|antd|naive|arco}/
  scripts/generate-samples.mjs          # 本套脱敏媒体（可复制后改 brand/seed）
  public/samples/
    images/scene_01.jpg … scene_06.jpg
    video/ep_01.mp4 … ep_06.mp4 (+ poster)
    audio/clip_01.wav … clip_03.wav (+ wave png optional)
    …既有 desk_* / bin_pick_* 可保留作兼容，新 episode 不共用单一 mp4
  src/mock/seed/
    prng.js
    paginate.js                         # page/pageSize/filters + 非法页→1
    media-manifest.js
    qc.js
    prelabel.js
    vla.js
    train.js
  src/mock/{qc,prelabel,vla,train,users}.js   # 改为调用 seed + 保留常量/TRANSITIONS
  src/services/{qc,prelabel,vla,train}.js     # list* 返回分页形状；调用方全量更新
  src/services/{qc,prelabel,vla,train}*.spec.js
  src/views/qc/QcTaskList.vue                 # + priority 等价筛选 + 分页
  src/views/vla/CollectConfig.vue             # + 场景/状态筛选 + 分页
  src/views/train/AlgoConfig.vue              # + 状态筛选 + 分页
  src/views/prelabel/TextPrelabel.vue         # + 分页（及 Vision）
  src/views/prelabel/VisionPrelabel.vue
  # WorkflowBoard / AnnotateWorkbench / 等：list 调用改为读 .items（pageSize 放大）
docs/superpowers/plans/acceptance-checklist.md  # 增补「厚数据」节
README.md                                       # 一句指向 enrichment spec/plan
vla-demo-*/docs/record-script-*.md              # 厚数据录屏段落
```

---

### Task 1: 分页助手契约（每套复制实现，先落 Element）

**Files:**
- Create: `vla-demo-element/src/mock/seed/prng.js`
- Create: `vla-demo-element/src/mock/seed/paginate.js`
- Create: `vla-demo-element/src/mock/seed/paginate.spec.js`
- Later copy same two helpers into antd/naive/arco seed 目录（常数不同只在 prng 默认 seed）

**Interfaces:**
- Produces: `createPrng(seed: number) => { next(): number, int(min,max): number, pick(arr): any, shuffle(arr): arr }`
- Produces: `paginate(rows, query) => { items, total, page, pageSize }`
- Query: `{ page?: number|string, pageSize?: number|string, filters?: object }`；过滤由调用方先做完再传入 rows，或传 `filterFn(rows, filters)`

- [ ] **Step 1: Write the failing test**

```js
// vla-demo-element/src/mock/seed/paginate.spec.js
import { describe, it, expect } from 'vitest'
import { paginate } from './paginate'
import { createPrng } from './prng'

describe('createPrng', () => {
  it('is deterministic for the same seed', () => {
    const a = createPrng(0xD11A7E01)
    const b = createPrng(0xD11A7E01)
    expect([a.next(), a.next(), a.int(0, 10)]).toEqual([b.next(), b.next(), b.int(0, 10)])
  })
})

describe('paginate', () => {
  const rows = Array.from({ length: 55 }, (_, i) => ({ id: i + 1 }))

  it('returns page slice and total', () => {
    const r = paginate(rows, { page: 2, pageSize: 10 })
    expect(r.total).toBe(55)
    expect(r.page).toBe(2)
    expect(r.pageSize).toBe(10)
    expect(r.items.map((x) => x.id)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
  })

  it('falls back to page 1 on illegal or out-of-range page', () => {
    expect(paginate(rows, { page: 0, pageSize: 10 }).page).toBe(1)
    expect(paginate(rows, { page: -3, pageSize: 10 }).page).toBe(1)
    expect(paginate(rows, { page: 'abc', pageSize: 10 }).page).toBe(1)
    expect(paginate(rows, { page: 99, pageSize: 10 }).page).toBe(1)
  })

  it('returns empty items with total 0 when rows empty', () => {
    const r = paginate([], { page: 3, pageSize: 10 })
    expect(r).toEqual({ items: [], total: 0, page: 1, pageSize: 10 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd E:\omp\vla\vla-demo-element && pnpm exec vitest run src/mock/seed/paginate.spec.js`
Expected: FAIL（模块不存在）

- [ ] **Step 3: Write minimal implementation**

```js
// vla-demo-element/src/mock/seed/prng.js
/** Mulberry32 — fixed seed, reproducible across refresh. */
export function createPrng(seed) {
  let t = seed >>> 0
  function next() {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1))
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length)]
    },
    shuffle(arr) {
      const a = [...arr]
      for (let i = a.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    },
  }
}

// vla-demo-element/src/mock/seed/paginate.js
export function paginate(rows, query = {}) {
  const list = Array.isArray(rows) ? rows : []
  const total = list.length
  let pageSize = Number(query.pageSize)
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = 10
  pageSize = Math.floor(pageSize)

  let page = Number(query.page)
  const illegal =
    !Number.isFinite(page) ||
    !Number.isInteger(page) ||
    page < 1 ||
    (total > 0 && (page - 1) * pageSize >= total)
  if (illegal) page = 1

  const start = (page - 1) * pageSize
  const items = list.slice(start, start + pageSize)
  return { items, total, page, pageSize }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd E:\omp\vla\vla-demo-element && pnpm exec vitest run src/mock/seed/paginate.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd E:\omp\vla
git add vla-demo-element/src/mock/seed/prng.js vla-demo-element/src/mock/seed/paginate.js vla-demo-element/src/mock/seed/paginate.spec.js
git commit -m "feat(element): add reproducible PRNG and list paginate helper"
```

---

### Task 2: Element QC seed ≥50 + list 分页筛选 + 组织维度

**Files:**
- Create: `vla-demo-element/src/mock/seed/qc.js`
- Create: `vla-demo-element/src/mock/seed/media-manifest.js`（先列路径，媒体文件 Task 6 生成）
- Modify: `vla-demo-element/src/mock/qc.js`（`createInitialTasks` 改为 hand + seed；保留 `MODALITIES`/`STATUS_FLOW`/`TRANSITIONS`/`SAMPLE_RESOURCES`）
- Modify: `vla-demo-element/src/mock/users.js`（扩展 `dept` 枚举人数可选；保持 `dept` 字段名）
- Modify: `vla-demo-element/src/services/qc.js`（`listQcTasks` / `listSamplePool` 返回分页形状；过滤 `status`/`modality`/`priority`/`keyword`）
- Modify: `vla-demo-element/src/views/qc/QcTaskList.vue`（接 `page`/`pageSize`/`priority` + `el-pagination`）
- Modify: `vla-demo-element/src/views/qc/WorkflowBoard.vue`、`AnnotateWorkbench.vue`、`AuditPanel.vue`（`const { items } = await listQcTasks({ page:1, pageSize:500 })`）
- Modify: `vla-demo-element/src/services/qc.transitions.spec.js`（若依赖 list 数组形状则改）
- Create: `vla-demo-element/src/services/qc.list.spec.js`

**Interfaces:**
- Consumes: `paginate`, `createPrng(0xD11A7E01)`
- Produces: `seedQcTasks(prng) => Task[]`（长度 ≥50，含手写行）；`listQcTasks({page,pageSize,status,modality,priority,keyword}) => PageResult`

- [ ] **Step 1: Write the failing test**

```js
// vla-demo-element/src/services/qc.list.spec.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('Element QC thick list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('seeds at least 50 QC tasks with DL- prefix and priority field', async () => {
    const { createInitialTasks } = await import('@/mock/qc')
    const tasks = createInitialTasks()
    expect(tasks.length).toBeGreaterThanOrEqual(50)
    expect(tasks.every((t) => String(t.id).startsWith('DL-'))).toBe(true)
    expect(tasks.every((t) => ['high', 'medium', 'low'].includes(t.priority))).toBe(true)
    expect(tasks.every((t) => typeof t.buCode === 'string')).toBe(true)
    // preserve showcase reject chain
    expect(tasks.some((t) => t.id === 'DL-2026-1102-0251' && t.status === 'rejected')).toBe(true)
  })

  it('listQcTasks pages and filters by status/modality/priority', async () => {
    const { listQcTasks } = await import('@/services/qc')
    const page1 = await listQcTasks({ page: 1, pageSize: 10 })
    expect(page1.items).toHaveLength(10)
    expect(page1.total).toBeGreaterThanOrEqual(50)
    expect(page1.page).toBe(1)

    const filtered = await listQcTasks({ page: 1, pageSize: 50, status: 'rejected' })
    expect(filtered.items.every((t) => t.status === 'rejected')).toBe(true)
    expect(filtered.total).toBe(filtered.items.length)

    const empty = await listQcTasks({ page: 1, pageSize: 10, keyword: '___no_such___' })
    expect(empty.total).toBe(0)
    expect(empty.items).toEqual([])

    const bad = await listQcTasks({ page: 999, pageSize: 10 })
    expect(bad.page).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd E:\omp\vla\vla-demo-element && pnpm exec vitest run src/services/qc.list.spec.js`
Expected: FAIL（数量 <50 或 list 仍返回数组）

- [ ] **Step 3: Implement seed + service + list UI**

```js
// vla-demo-element/src/mock/seed/qc.js
import { createPrng } from './prng'

const STATUSES = ['created','assigned','annotating','reviewing','final_review','done','rejected']
const MODS = ['text_ner','seg','audio_slice','video_det','point_seg']
const PRIOS = ['high','medium','low']
const BUS = ['BU-华东','BU-华南','BU-华北','BU-西南']

export function seedQcTasks(handRows, seed = 0xD11A7E01) {
  const rng = createPrng(seed)
  const out = [...handRows]
  let seq = 400
  while (out.length < 56) {
    seq += 1
    const modality = rng.pick(MODS)
    const status = rng.pick(STATUSES)
    out.push({
      id: `DL-2026-11${String(rng.int(1,4)).padStart(2,'0')}-${String(seq).padStart(4,'0')}`,
      title: `数联质检工单-${modality}-${seq}`,
      modality,
      status,
      priority: rng.pick(PRIOS),
      buCode: rng.pick(BUS),
      creatorId: 'u-dl-admin',
      assigneeId: rng.pick(['u-dl-annotator','u-dl-annotator-2', null]),
      collaborators: ['u-dl-annotator'],
      createdAt: `2026-11-0${rng.int(1,4)} ${String(rng.int(8,18)).padStart(2,'0')}:${String(rng.int(0,59)).padStart(2,'0')}:00`,
      updatedAt: `2026-11-04 ${String(rng.int(9,20)).padStart(2,'0')}:00:00`,
      batchId: `BATCH-${modality.toUpperCase()}-${seq}`,
      sampleCount: rng.int(10, 200),
      doneCount: rng.int(0, 200),
      resourceId: `res-seed-${modality}`,
      comments: [],
      history: [{ at: '2026-11-04 09:00:00', actor: '周明轩', action: '创建工单', note: 'seed' }],
      rejectReason: status === 'rejected' ? rng.pick(['label_miss','label_wrong','boundary_bad']) : null,
      rejectChain: status === 'rejected'
        ? [{ at: '2026-11-04 10:00:00', by: 'u-dl-reviewer', reason: 'label_miss' }]
        : [],
      labelsSnapshot: [],
    })
  }
  return out
}
```

在 `mock/qc.js` 的 `createInitialTasks` 末尾改为：

```js
import { seedQcTasks } from './seed/qc'
export function createInitialTasks() {
  const hand = [ /* 现有 6 条原样保留，并为每条补 buCode / rejectChain */ ]
  try {
    return seedQcTasks(hand)
  } catch (e) {
    console.error('[datalink] QC seed failed, fallback thin', e)
    return hand
  }
}
```

`services/qc.js`：

```js
import { paginate } from '@/mock/seed/paginate'

export async function listQcTasks(query = {}) {
  await businessDelay()
  const { page, pageSize, status, modality, priority, keyword } = query
  let rows = [...state.tasks]
  if (status) rows = rows.filter((t) => t.status === status)
  if (modality) rows = rows.filter((t) => t.modality === modality)
  if (priority) rows = rows.filter((t) => t.priority === priority)
  if (keyword) {
    const kw = String(keyword).trim()
    rows = rows.filter((t) => t.id.includes(kw) || t.title.includes(kw))
  }
  return paginate(rows, { page, pageSize })
}
```

`QcTaskList.vue` 关键改动：

```js
const filters = reactive({ keyword: '', status: '', modality: '', priority: '' })
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

async function load() {
  loading.value = true
  try {
    Object.assign(meta, listMeta())
    const res = await listQcTasks({ ...filters, page: page.value, pageSize: pageSize.value })
    tasks.value = res.items
    total.value = res.total
    page.value = res.page
  } finally {
    loading.value = false
  }
}
```

```vue
<el-pagination
  v-model:current-page="page"
  v-model:page-size="pageSize"
  :total="total"
  layout="total, prev, pager, next, sizes"
  :page-sizes="[10, 20, 50]"
  @current-change="load"
  @size-change="() => { page = 1; load() }"
/>
```

- [ ] **Step 4: Run tests**

Run: `cd E:\omp\vla\vla-demo-element && pnpm exec vitest run src/services/qc.list.spec.js src/services/qc.transitions.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add vla-demo-element/src/mock/seed/qc.js vla-demo-element/src/mock/qc.js vla-demo-element/src/mock/users.js vla-demo-element/src/services/qc.js vla-demo-element/src/services/qc.list.spec.js vla-demo-element/src/views/qc/QcTaskList.vue vla-demo-element/src/views/qc/WorkflowBoard.vue vla-demo-element/src/views/qc/AnnotateWorkbench.vue vla-demo-element/src/views/qc/AuditPanel.vue
git commit -m "feat(element): thicken QC tasks with seed, filters, and pagination"
```

---

### Task 3: Element 预标注加厚 + 分页

**Files:**
- Create: `vla-demo-element/src/mock/seed/prelabel.js`
- Modify: `vla-demo-element/src/mock/prelabel.js`（`TEXT_DOCS`/`VISION_IMAGES`/`createAcceptJobs` 合并 seed；保留故意 Diff：`te4→ORG`、`y3→tool`）
- Modify: `vla-demo-element/src/services/prelabel.js`（`listTextDocs`/`listVisionImages`/`listAcceptJobs` → PageResult；过滤 `status`/`batchId`/`keyword`）
- Modify: `vla-demo-element/src/views/prelabel/TextPrelabel.vue`、`VisionPrelabel.vue`、`AcceptWizard.vue`
- Modify: `vla-demo-element/src/services/prelabel.spec.js`
- Create: `vla-demo-element/src/services/prelabel.list.spec.js`

**Interfaces:**
- Consumes: `createPrng(0xD11A7E01)`, `paginate`
- Produces: ≥50 `TEXT_DOCS`（`DL-TXT-`）、≥50 `VISION_IMAGES`（`DL-IMG-`）；批次字段 `batchId`、`progressPct`、`spotCheckPass`

- [ ] **Step 1: Write the failing test**

```js
// vla-demo-element/src/services/prelabel.list.spec.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { TEXT_DOCS, VISION_IMAGES } from '@/mock/prelabel'

describe('Element prelabel thick seeds', () => {
  it('keeps intentional Diff and grows to 50+', () => {
    expect(TEXT_DOCS.length).toBeGreaterThanOrEqual(50)
    expect(VISION_IMAGES.length).toBeGreaterThanOrEqual(50)
    const bad = TEXT_DOCS.find((d) => d.id === 'DL-TXT-2026-001')
    expect(bad.model.entities.find((e) => e.id === 'te4')?.type).toBe('ORG')
    expect(TEXT_DOCS.every((d) => typeof d.progressPct === 'number')).toBe(true)
    expect(TEXT_DOCS.every((d) => 'spotCheckPass' in d)).toBe(true)
  })
})

describe('Element prelabel list paging', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })
  it('pages text docs and supports empty filter', async () => {
    const { listTextDocs } = await import('@/services/prelabel')
    const res = await listTextDocs({ page: 1, pageSize: 10 })
    expect(res.items).toHaveLength(10)
    expect(res.total).toBeGreaterThanOrEqual(50)
    const empty = await listTextDocs({ page: 1, pageSize: 10, keyword: '___none___' })
    expect(empty.total).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd E:\omp\vla\vla-demo-element && pnpm exec vitest run src/services/prelabel.list.spec.js`
Expected: FAIL

- [ ] **Step 3: Implement seed + wiring**

```js
// vla-demo-element/src/mock/seed/prelabel.js
import { createPrng } from './prng'

export function seedTextDocs(hand, seed = 0xD11A7E01) {
  const rng = createPrng(seed ^ 0x1111)
  const out = hand.map((d) => ({
    ...d,
    progressPct: d.progressPct ?? 100,
    spotCheckPass: d.spotCheckPass ?? true,
  }))
  let i = 100
  while (out.length < 56) {
    i += 1
    out.push({
      id: `DL-TXT-2026-${String(i).padStart(3, '0')}`,
      title: `数联预标文本批次样例-${i}`,
      batchId: `PRE-BATCH-T${String(rng.int(1, 12)).padStart(2, '0')}`,
      status: rng.pick(['ready', 'running', 'corrected', 'accepted']),
      progressPct: rng.int(0, 100),
      spotCheckPass: rng.pick([true, true, false]),
      rawText: `脱敏工单正文 seed-${i}：订单 DL-ORD-${8000 + i} 状态咨询。`,
      model: {
        classify: { label: rng.pick(['咨询-进度', '投诉-物流延误', '其他']), conf: 0.7 + rng.next() * 0.2 },
        entities: [
          { id: `te-s-${i}`, text: `DL-ORD-${8000 + i}`, type: 'ORDER_ID', start: 10, end: 22, conf: 0.9 },
        ],
        relations: [],
        structured: { orderId: `DL-ORD-${8000 + i}`, customer: '某用户', issue: '咨询', channel: '在线' },
      },
      goldHint: {},
    })
  }
  return out
}

export function seedVisionImages(hand, seed = 0xD11A7E01) {
  const rng = createPrng(seed ^ 0x2222)
  const scenes = ['scene_01.jpg','scene_02.jpg','scene_03.jpg','scene_04.jpg','scene_05.jpg','scene_06.jpg']
  const out = hand.map((d) => ({
    ...d,
    progressPct: d.progressPct ?? 100,
    spotCheckPass: d.spotCheckPass ?? true,
  }))
  let i = 100
  while (out.length < 56) {
    i += 1
    const img = rng.pick(scenes)
    out.push({
      id: `DL-IMG-2026-${String(i).padStart(3, '0')}`,
      title: `数联预标视觉样例-${i}`,
      imageUrl: `/samples/images/${img}`,
      width: 640,
      height: 400,
      status: rng.pick(['ready', 'running', 'corrected']),
      progressPct: rng.int(0, 100),
      spotCheckPass: rng.pick([true, false]),
      ocrModel: [{ id: `o-s-${i}`, text: `TAG-${i}`, x: 0.1, y: 0.1, w: 0.2, h: 0.08, conf: 0.8 }],
      yoloModel: [{ id: `y-s-${i}`, label: rng.pick(['cup','plate','tray']), x: 0.2, y: 0.2, w: 0.2, h: 0.2, conf: 0.85 }],
      labelSet: ['cup', 'plate', 'hand', 'tray', 'tool', 'table', 'other'],
    })
  }
  return out
}
```

`listTextDocs`：

```js
export async function listTextDocs(query = {}) {
  await businessDelay()
  let rows = [...state.textDocs]
  if (query.status) rows = rows.filter((d) => d.status === query.status)
  if (query.batchId) rows = rows.filter((d) => d.batchId === query.batchId)
  if (query.keyword) {
    const kw = String(query.keyword).trim()
    rows = rows.filter((d) => d.id.includes(kw) || d.title.includes(kw))
  }
  return paginate(rows, query)
}
```

同理 `listVisionImages` / `listAcceptJobs`。Accept 任务 seed 到 ≥20 即可（非核心「每域」主列表，但要可翻页）；主验收看 TEXT/VISION ≥50。

- [ ] **Step 4: Run tests**

Run: `cd E:\omp\vla\vla-demo-element && pnpm exec vitest run src/services/prelabel.spec.js src/services/prelabel.list.spec.js`
Expected: PASS（更新旧断言 `TEXT_DOCS.length >= 2` 仍成立；若有 `every id startsWith` 保持）

- [ ] **Step 5: Commit**

```bash
git add vla-demo-element/src/mock/seed/prelabel.js vla-demo-element/src/mock/prelabel.js vla-demo-element/src/services/prelabel.js vla-demo-element/src/services/prelabel.list.spec.js vla-demo-element/src/services/prelabel.spec.js vla-demo-element/src/views/prelabel/*.vue
git commit -m "feat(element): thicken prelabel docs/images with paging"
```

---

### Task 4: Element VLA episode ≥50 + 轨迹 JSON + 多样媒体引用

**Files:**
- Create: `vla-demo-element/src/mock/seed/vla.js`
- Modify: `vla-demo-element/src/mock/vla.js`（`VLA_TASKS` → hand + seed episodes；场景 value 保持 Element 表）
- Modify: `vla-demo-element/src/services/vla.js`（`listVlaTasks` PageResult；过滤 `scene`/`mode`/`status`；`getVlaTask` 含 `trajectory`）
- Modify: `vla-demo-element/src/views/vla/CollectConfig.vue`、`TimelineAnnotate.vue`、`QualityGate.vue`
- Modify: `vla-demo-element/src/services/vla.spec.js`
- Create: `vla-demo-element/src/services/vla.list.spec.js`

**Interfaces:**
- Episode 字段：`trajectory: { joints: number[][], gripper: number[], tSec: number[], hz: number }`
- 媒体：`videoUrl`/`imageUrl` 轮转 `/samples/video/ep_0N.mp4` 与 poster，**禁止**全部指向 `bin_pick.mp4`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VLA_TASKS } from '@/mock/vla'

describe('Element VLA thick episodes', () => {
  it('has 50+ DL-VLA episodes with trajectory JSON and diversified media', () => {
    expect(VLA_TASKS.length).toBeGreaterThanOrEqual(50)
    expect(VLA_TASKS.every((t) => t.id.startsWith('DL-VLA-'))).toBe(true)
    const withTraj = VLA_TASKS.filter((t) => t.trajectory?.joints?.length >= 5)
    expect(withTraj.length).toBeGreaterThanOrEqual(40)
    const videos = new Set(VLA_TASKS.map((t) => t.videoUrl))
    expect(videos.size).toBeGreaterThanOrEqual(4)
    expect(VLA_TASKS.some((t) => t.id === 'DL-VLA-2026-001')).toBe(true)
  })
})

describe('Element VLA list', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.resetModules() })
  it('pages and filters by scene', async () => {
    const { listVlaTasks, getVlaTask } = await import('@/services/vla')
    const res = await listVlaTasks({ page: 1, pageSize: 10 })
    expect(res.total).toBeGreaterThanOrEqual(50)
    expect(res.items).toHaveLength(10)
    const one = await getVlaTask('DL-VLA-2026-001')
    expect(one.trajectory.joints[0].length).toBeGreaterThanOrEqual(6)
    expect(one.trajectory.gripper.length).toBe(one.trajectory.tSec.length)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd E:\omp\vla\vla-demo-element && pnpm exec vitest run src/services/vla.list.spec.js`

- [ ] **Step 3: Implement**

```js
// vla-demo-element/src/mock/seed/vla.js
import { createPrng } from './prng'

function makeTrajectory(rng, frames = 24, dof = 7) {
  const joints = []
  const gripper = []
  const tSec = []
  for (let i = 0; i < frames; i += 1) {
    joints.push(Array.from({ length: dof }, (_, j) => Number((rng.next() * 1.2 - 0.4 + j * 0.01).toFixed(4))))
    gripper.push(Number((rng.next()).toFixed(3)))
    tSec.push(Number((i / 10).toFixed(2)))
  }
  return { joints, gripper, tSec, hz: 10 }
}

export function seedVlaEpisodes(hand, seed = 0xD11A7E01) {
  const rng = createPrng(seed ^ 0x3333)
  const scenes = ['kitchen_counter','lab_bench','warehouse_bin','office_desk']
  const plans = ['pick_place_std','open_drawer','wipe_surface','sort_parts']
  const modes = ['teleop','scripted','human_demo','mixed']
  const videos = [1,2,3,4,5,6].map((n) => ({
    videoUrl: `/samples/video/ep_0${n}.mp4`,
    imageUrl: `/samples/video/ep_0${n}_poster.jpg`,
  }))
  const out = hand.map((t, idx) => ({
    ...t,
    trajectory: t.trajectory || makeTrajectory(rng, Math.min(30, t.totalFrames || 24)),
    videoUrl: t.videoUrl?.includes('bin_pick') ? videos[idx % videos.length].videoUrl : t.videoUrl,
    imageUrl: t.imageUrl?.includes('bin_pick') ? videos[idx % videos.length].imageUrl : t.imageUrl,
  }))
  let seq = out.length + 1
  while (out.length < 56) {
    const media = videos[(seq - 1) % videos.length]
    const frames = rng.int(80, 140)
    out.push({
      id: `DL-VLA-2026-${String(seq).padStart(3, '0')}`,
      name: `数联采集episode-${seq}`,
      scene: rng.pick(scenes),
      plan: rng.pick(plans),
      mode: rng.pick(modes),
      actionTemplateIds: ['tpl-reach', 'tpl-grasp', 'tpl-place'],
      personnelIds: [rng.pick(['u-dl-annotator', 'u-dl-annotator-2'])],
      instruction: `脱敏指令：完成 episode ${seq} 抓取放置。`,
      ...media,
      fps: 10,
      totalFrames: frames,
      durationSec: Number((frames / 10).toFixed(1)),
      status: rng.pick(['ready', 'annotating', 'done']),
      createdAt: `2026-11-0${rng.int(1, 4)} 12:00:00`,
      actions: [],
      issuesSeed: [],
      trajectory: makeTrajectory(rng, 24),
    })
    seq += 1
  }
  return out
}
```

`listVlaTasks`：

```js
export async function listVlaTasks(query = {}) {
  await businessDelay()
  let rows = state.tasks.map((t) => ({
    id: t.id, name: t.name, scene: t.scene, plan: t.plan, mode: t.mode,
    status: t.status, createdAt: t.createdAt,
    actionCount: t.actions.length, issueCount: t.issues.length,
    issuesDetected: t.issuesDetected, personnelIds: [...t.personnelIds],
  }))
  if (query.scene) rows = rows.filter((t) => t.scene === query.scene)
  if (query.mode) rows = rows.filter((t) => t.mode === query.mode)
  if (query.status) rows = rows.filter((t) => t.status === query.status)
  return paginate(rows, query)
}
```

- [ ] **Step 4: Run tests**

Run: `cd E:\omp\vla\vla-demo-element && pnpm exec vitest run src/services/vla.spec.js src/services/vla.list.spec.js`
Expected: PASS（更新 `VLA_TASKS.length >= 2` 类断言即可）

- [ ] **Step 5: Commit**

```bash
git add vla-demo-element/src/mock/seed/vla.js vla-demo-element/src/mock/vla.js vla-demo-element/src/services/vla.js vla-demo-element/src/services/vla.list.spec.js vla-demo-element/src/services/vla.spec.js vla-demo-element/src/views/vla/*.vue
git commit -m "feat(element): thicken VLA episodes with trajectory JSON and media refs"
```

---

### Task 5: Element 训练数据集 / checkpoint / 验证表 / 实验 ≥50

**Files:**
- Create: `vla-demo-element/src/mock/seed/train.js`
- Modify: `vla-demo-element/src/mock/train.js`
- Modify: `vla-demo-element/src/services/train.js`（`listExperiments` PageResult；`getExperiment` 含 `datasets`/`checkpoints`/`valTable`/`confusionMatrix`；日志加长）
- Modify: `vla-demo-element/src/views/train/AlgoConfig.vue`、`TrainRunner.vue`、`MetricsPanel.vue`
- Create: `vla-demo-element/src/services/train.list.spec.js`
- Modify: `vla-demo-element/src/services/train.spec.js`

**Interfaces:**
- `datasets: [{ id, name, split: 'train'|'val'|'test', versionPin, sampleCount }]`
- `checkpoints: [{ id, epoch, path, metric }]`
- `valTable: [{ cls, precision, recall, f1 }]`
- `confusionMatrix: number[][]`
- `logs` 成品实验 ≥30 行

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { EXPERIMENTS } from '@/mock/train'

describe('Element train thick experiments', () => {
  it('seeds 50+ DL-EXP with datasets/checkpoints/valTable/confusionMatrix', () => {
    expect(EXPERIMENTS.length).toBeGreaterThanOrEqual(50)
    const fin = EXPERIMENTS.find((e) => e.id === 'DL-EXP-2026-001')
    expect(fin.datasets.length).toBeGreaterThanOrEqual(2)
    expect(fin.datasets[0]).toEqual(expect.objectContaining({ split: expect.any(String), versionPin: expect.any(String) }))
    expect(fin.checkpoints.length).toBeGreaterThanOrEqual(1)
    expect(fin.valTable.length).toBeGreaterThanOrEqual(3)
    expect(fin.confusionMatrix.length).toBeGreaterThanOrEqual(3)
    expect(fin.logs.length).toBeGreaterThanOrEqual(30)
  })
})

describe('Element train list', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.resetModules() })
  it('pages experiments and filters status', async () => {
    const { listExperiments } = await import('@/services/train')
    const res = await listExperiments({ page: 1, pageSize: 10, status: 'finished' })
    expect(res.total).toBeGreaterThanOrEqual(1)
    expect(res.items.every((e) => e.status === 'finished')).toBe(true)
    const bad = await listExperiments({ page: -1, pageSize: 10 })
    expect(bad.page).toBe(1)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd E:\omp\vla\vla-demo-element && pnpm exec vitest run src/services/train.list.spec.js`

- [ ] **Step 3: Implement**

```js
// vla-demo-element/src/mock/seed/train.js
import { createPrng } from './prng'
import { mockMetricPoint } from '../train'

function longLogs(rng, n, prefix) {
  return Array.from({ length: n }, (_, i) => ({
    at: `2026-11-02 ${String(9 + Math.floor(i / 6)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:00`,
    level: i === n - 1 ? 'success' : 'info',
    message: `${prefix} step ${i + 1}/${n} loss=${(2 - i / n).toFixed(3)}`,
  }))
}

export function enrichExperiment(e, rng) {
  const cls = ['cup', 'plate', 'hand', 'other']
  return {
    ...e,
    datasets: e.datasets || [
      { id: `DS-DL-${e.id}-tr`, name: '数联回流训练集', split: 'train', versionPin: 'v2026.11.02', sampleCount: 12000 },
      { id: `DS-DL-${e.id}-va`, name: '数联验证集', split: 'val', versionPin: 'v2026.11.02', sampleCount: 1500 },
    ],
    checkpoints: e.checkpoints || [
      { id: `CKPT-${e.id}-e10`, epoch: 10, path: `/ckpts/${e.id}/e10.pt`, metric: 0.72 },
      { id: `CKPT-${e.id}-best`, epoch: e.epochs || 20, path: `/ckpts/${e.id}/best.pt`, metric: 0.81 },
    ],
    valTable: e.valTable || cls.map((c) => ({
      cls: c,
      precision: Number((0.7 + rng.next() * 0.25).toFixed(3)),
      recall: Number((0.65 + rng.next() * 0.3).toFixed(3)),
      f1: Number((0.68 + rng.next() * 0.25).toFixed(3)),
    })),
    confusionMatrix: e.confusionMatrix || [
      [50, 2, 1, 0],
      [3, 44, 2, 1],
      [1, 2, 40, 3],
      [0, 1, 2, 38],
    ],
    logs: e.logs && e.logs.length >= 30 ? e.logs : longLogs(rng, 36, e.name),
  }
}

export function seedExperiments(hand, seed = 0xD11A7E01) {
  const rng = createPrng(seed ^ 0x4444)
  const algos = ['vla_policy', 'det_yolo', 'seg_mask2former', 'ner_bert']
  const statuses = ['finished', 'ready', 'draft', 'running']
  const out = hand.map((e) => enrichExperiment(e, rng))
  let seq = out.length + 1
  while (out.length < 56) {
    const epochs = rng.int(5, 30)
    const status = rng.pick(statuses)
    const id = `DL-EXP-2026-${String(seq).padStart(3, '0')}`
    const base = {
      id,
      name: `数联实验-${seq}`,
      algorithm: rng.pick(algos),
      version: 'v1.0',
      model: 'yolov8n',
      batchSize: rng.pick([4, 8, 16]),
      learningRate: 0.0001 * rng.int(1, 10),
      epochs,
      augment: rng.pick([true, false]),
      augmentOps: ['flip'],
      gpuIds: status === 'draft' ? [] : ['gpu-0'],
      status,
      currentEpoch: status === 'finished' ? epochs : 0,
      createdAt: '2026-11-03 10:00:00',
      startedAt: null,
      finishedAt: null,
      logs: [{ at: '2026-11-03 10:00:00', level: 'info', message: 'seed created' }],
      metrics: { loss: [], acc: [], map: [] },
    }
    if (status === 'finished') {
      base.metrics = {
        loss: Array.from({ length: epochs }, (_, i) => mockMetricPoint(i + 1, epochs).loss),
        acc: Array.from({ length: epochs }, (_, i) => mockMetricPoint(i + 1, epochs).acc),
        map: Array.from({ length: epochs }, (_, i) => mockMetricPoint(i + 1, epochs).map),
      }
    }
    out.push(enrichExperiment(base, rng))
    seq += 1
  }
  return out
}
```

`listExperiments` 改为 `paginate` + `status`/`algorithm`/`keyword` 过滤。MetricsPanel 展示 `valTable` 与 `confusionMatrix`（简单 `el-table` + 矩阵预格式化文本即可，不新开评分点）。

- [ ] **Step 4: Run tests**

Run: `cd E:\omp\vla\vla-demo-element && pnpm exec vitest run src/services/train.spec.js src/services/train.list.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add vla-demo-element/src/mock/seed/train.js vla-demo-element/src/mock/train.js vla-demo-element/src/services/train.js vla-demo-element/src/services/train.list.spec.js vla-demo-element/src/services/train.spec.js vla-demo-element/src/views/train/*.vue
git commit -m "feat(element): thicken train experiments with datasets and checkpoints"
```

---

### Task 6: Element 脱敏媒体生成（ffmpeg）+ manifest

**Files:**
- Create: `vla-demo-element/scripts/generate-samples.mjs`
- Create/Update: `vla-demo-element/src/mock/seed/media-manifest.js`
- Create: `vla-demo-element/public/samples/images/scene_01.jpg` … `scene_06.jpg`
- Create: `vla-demo-element/public/samples/video/ep_01.mp4` … `ep_06.mp4` + `_poster.jpg`
- Create: `vla-demo-element/public/samples/audio/clip_01.wav` … `clip_03.wav`
- Modify: `vla-demo-element/public/samples/README.md`（注明合成脱敏、时长对齐）
- Create: `vla-demo-element/scripts/generate-samples.spec.js`（断言 manifest 条目与文件存在；可在 node 侧用 `fs.existsSync`）

**前提：** 本机已有 `ffmpeg`（`D:\Program Files\ffmpeg\bin\ffmpeg.exe`）、`node`。

- [ ] **Step 1: Write the failing manifest test**

```js
// vla-demo-element/scripts/generate-samples.spec.js
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MEDIA_MANIFEST } from '../src/mock/seed/media-manifest.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('Element media manifest', () => {
  it('lists diversified samples with durationSec and existing files', () => {
    expect(MEDIA_MANIFEST.videos.length).toBeGreaterThanOrEqual(6)
    expect(MEDIA_MANIFEST.images.length).toBeGreaterThanOrEqual(6)
    expect(MEDIA_MANIFEST.audios.length).toBeGreaterThanOrEqual(3)
    for (const v of MEDIA_MANIFEST.videos) {
      expect(v.durationSec).toBeGreaterThan(0)
      expect(fs.existsSync(path.join(root, 'public', v.path.replace(/^\//, '')))).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run — expect FAIL**（缺文件 / 缺 manifest）

Run: `cd E:\omp\vla\vla-demo-element && pnpm exec vitest run scripts/generate-samples.spec.js`

- [ ] **Step 3: Implement generator + run it**

```js
// vla-demo-element/scripts/generate-samples.mjs
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ffmpeg = process.env.FFMPEG || 'ffmpeg'
const brand = 'DataLink'
const colors = ['#1677ff','#52c41a','#fa8c16','#722ed1','#13c2c2','#eb2f96']

function run(args) {
  const r = spawnSync(ffmpeg, args, { stdio: 'inherit' })
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`)
}

fs.mkdirSync(path.join(root, 'public/samples/images'), { recursive: true })
fs.mkdirSync(path.join(root, 'public/samples/video'), { recursive: true })
fs.mkdirSync(path.join(root, 'public/samples/audio'), { recursive: true })

for (let i = 1; i <= 6; i += 1) {
  const color = colors[i - 1]
  const img = path.join(root, `public/samples/images/scene_0${i}.jpg`)
  run(['-y', '-f', 'lavfi', '-i', `color=c=${color}:s=640x360:d=1`,
    '-vf', `drawtext=text='${brand} scene ${i} DESENSITIZED':x=24:y=24:fontsize=28:fontcolor=white`,
    '-frames:v', '1', img])
  const mp4 = path.join(root, `public/samples/video/ep_0${i}.mp4`)
  const dur = 2 + (i % 3) // 2–4s，与 seed durationSec 对齐时按实际写入 manifest
  run(['-y', '-f', 'lavfi', '-i', `color=c=${color}:s=640x360:d=${dur}`,
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=' + dur,
    '-vf', `drawtext=text='${brand} EP0${i}':x=40:y=40:fontsize=32:fontcolor=white`,
    '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', mp4])
  run(['-y', '-i', mp4, '-frames:v', '1', path.join(root, `public/samples/video/ep_0${i}_poster.jpg`)])
}
for (let i = 1; i <= 3; i += 1) {
  const wav = path.join(root, `public/samples/audio/clip_0${i}.wav`)
  run(['-y', '-f', 'lavfi', '-i', `sine=frequency=${300 + i * 80}:duration=1.${i}`, wav])
}
console.log('Element samples generated')
```

```js
// vla-demo-element/src/mock/seed/media-manifest.js
export const MEDIA_MANIFEST = {
  brand: 'DataLink',
  images: [1,2,3,4,5,6].map((i) => ({ path: `/samples/images/scene_0${i}.jpg`, w: 640, h: 360 })),
  videos: [
    { path: '/samples/video/ep_01.mp4', poster: '/samples/video/ep_01_poster.jpg', durationSec: 2 },
    { path: '/samples/video/ep_02.mp4', poster: '/samples/video/ep_02_poster.jpg', durationSec: 3 },
    { path: '/samples/video/ep_03.mp4', poster: '/samples/video/ep_03_poster.jpg', durationSec: 4 },
    { path: '/samples/video/ep_04.mp4', poster: '/samples/video/ep_04_poster.jpg', durationSec: 2 },
    { path: '/samples/video/ep_05.mp4', poster: '/samples/video/ep_05_poster.jpg', durationSec: 3 },
    { path: '/samples/video/ep_06.mp4', poster: '/samples/video/ep_06_poster.jpg', durationSec: 4 },
  ],
  audios: [
    { path: '/samples/audio/clip_01.wav', durationSec: 1.1 },
    { path: '/samples/audio/clip_02.wav', durationSec: 1.2 },
    { path: '/samples/audio/clip_03.wav', durationSec: 1.3 },
  ],
}
```

Run generator:

```bash
cd E:\omp\vla\vla-demo-element
node scripts/generate-samples.mjs
```

若 `drawtext` 缺字体失败：去掉 `drawtext`，改用纯色 + 不同 `color=` / `sine=` 频率保证哈希不同；manifest 仍写 durationSec。生成后用 `ffprobe` 核对时长并回写 manifest。

占位策略（详情页）：`<img @error="onMediaMissing">` 已有则补 log；否则在播放器组件加：

```js
function onMediaMissing(url) {
  console.warn('[datalink] media missing, showing placeholder', url)
}
```

- [ ] **Step 4: Re-run media test + 更新 VLA seed durationSec 与 manifest 一致**

Run: `cd E:\omp\vla\vla-demo-element && pnpm exec vitest run scripts/generate-samples.spec.js src/services/vla.list.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add vla-demo-element/scripts/generate-samples.mjs vla-demo-element/scripts/generate-samples.spec.js vla-demo-element/src/mock/seed/media-manifest.js vla-demo-element/public/samples vla-demo-element/src/mock/seed/vla.js
git commit -m "feat(element): generate desensitized sample media and manifest"
```

---

### Task 7: Orion（antd）独立 seed / 字段 / 媒体 / 分页

**Files:**
- Create: `vla-demo-antd/src/mock/seed/{prng,paginate,qc,prelabel,vla,train,media-manifest}.js`（**新文件，禁止 from element import**）
- Create: `vla-demo-antd/scripts/generate-samples.mjs`（brand=`Orion`，色板与频率不同）
- Modify: `vla-demo-antd/src/mock/{qc,prelabel,vla,train,users}.js`
- Modify: `vla-demo-antd/src/services/{qc,prelabel,vla,train}.js` + views list 页
- Create: `vla-demo-antd/src/services/{qc,prelabel,vla,train}.list.spec.js`
- Create: `vla-demo-antd/src/mock/seed/paginate.spec.js`

**Orion 字段（必须按此命名）：**
- PRNG: `0x02A10D01`
- QC 优先级字段名 **`severity`**，枚举 **`P0`/`P1`/`P2`**（删除对 `priority` 的依赖；筛选与表列改 severity）
- 组织：users **`team`**（如 `Orion Ops` / `Dataset Guild` / `Label Desk`）
- QC 附加：`workspace`（如 `ws-sg`/`ws-eu`/`ws-us`）
- 驳回链：`rejectionTrail: [{ at, reviewerId, code }]`
- VLA 场景 value：`aisle_pick`/`cold_lab`/`mezzanine`/`lobby_desk`（同步改 `SCENE_OPTIONS`）
- 轨迹：`telem: { qpos: number[][], grip: number[], tsMs: number[], hz }`
- 训练：`catalog[]`（`fold`/`rev`）、`ckptList[]`、`evalGrid`、`cmMatrix`、`runLog[]`
- ID：`ORN-` / `ORN-VLA-` / `ORN-TXT-` / `ORN-IMG-` / `ORN-EXP-` / `ORN-ACC-`

- [ ] **Step 1: Write failing Orion-specific tests**

```js
// vla-demo-antd/src/services/qc.list.spec.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('Orion QC thick list', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.resetModules() })
  it('uses severity P0-P2 and workspace, not priority/dept', async () => {
    const { createInitialTasks } = await import('@/mock/qc')
    const tasks = createInitialTasks()
    expect(tasks.length).toBeGreaterThanOrEqual(50)
    expect(tasks.every((t) => t.id.startsWith('ORN-'))).toBe(true)
    expect(tasks.every((t) => ['P0','P1','P2'].includes(t.severity))).toBe(true)
    expect(tasks.every((t) => typeof t.workspace === 'string')).toBe(true)
    expect(tasks.some((t) => 'priority' in t)).toBe(false)
    const { users } = await import('@/mock/users')
    expect(users.every((u) => typeof u.team === 'string')).toBe(true)
    expect(users.some((u) => 'dept' in u)).toBe(false)
  })
  it('pages with severity filter', async () => {
    const { listQcTasks } = await import('@/services/qc')
    const res = await listQcTasks({ page: 1, pageSize: 10, severity: 'P0' })
    expect(res.items.every((t) => t.severity === 'P0')).toBe(true)
    expect((await listQcTasks({ page: 99, pageSize: 10 })).page).toBe(1)
  })
})
```

```js
// vla-demo-antd/src/services/vla.list.spec.js（节选）
it('episodes use telem.qpos/grip/tsMs and Orion scenes', async () => {
  const { VLA_TASKS, SCENE_OPTIONS } = await import('@/mock/vla')
  expect(VLA_TASKS.length).toBeGreaterThanOrEqual(50)
  expect(SCENE_OPTIONS.map((s) => s.value)).toEqual([
    'aisle_pick', 'cold_lab', 'mezzanine', 'lobby_desk',
  ])
  const ep = VLA_TASKS.find((t) => t.telem?.qpos?.length >= 5)
  expect(ep.telem.grip.length).toBe(ep.telem.tsMs.length)
  expect(new Set(VLA_TASKS.map((t) => t.videoUrl)).size).toBeGreaterThanOrEqual(4)
})
```

```js
// train.list.spec.js 节选
it('uses catalog/ckptList/evalGrid/cmMatrix/runLog', async () => {
  const { EXPERIMENTS } = await import('@/mock/train')
  expect(EXPERIMENTS.length).toBeGreaterThanOrEqual(50)
  const e = EXPERIMENTS.find((x) => x.id === 'ORN-EXP-2026-001')
  expect(e.catalog[0]).toEqual(expect.objectContaining({ fold: expect.any(String), rev: expect.any(String) }))
  expect(e.ckptList.length).toBeGreaterThanOrEqual(1)
  expect(e.evalGrid.length).toBeGreaterThanOrEqual(3)
  expect(e.cmMatrix.length).toBeGreaterThanOrEqual(3)
  expect(e.runLog.length).toBeGreaterThanOrEqual(30)
  expect(e).not.toHaveProperty('datasets')
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd E:\omp\vla\vla-demo-antd && pnpm exec vitest run src/services/qc.list.spec.js src/services/vla.list.spec.js src/services/train.list.spec.js`

- [ ] **Step 3: Implement Orion seeds + service filters + UI**

QC seed 关键字段示例：

```js
// vla-demo-antd/src/mock/seed/qc.js
import { createPrng } from './prng'
const SEVERITIES = ['P0', 'P1', 'P2']
const WORKSPACES = ['ws-sg', 'ws-eu', 'ws-us']
export function seedQcTasks(hand, seed = 0x02A10D01) {
  const rng = createPrng(seed)
  const out = hand.map((t) => ({
    ...t,
    severity: t.severity || 'P1',
    workspace: t.workspace || 'ws-sg',
    rejectionTrail: t.rejectionTrail || (t.status === 'rejected'
      ? [{ at: t.updatedAt, reviewerId: 'u-orn-reviewer', code: t.rejectReason || 'label_miss' }]
      : []),
  }))
  // …生成至 ≥56，id 前缀 ORN-2026-…
  return out
}
```

`listQcTasks` 过滤键为 `severity`（不是 `priority`）。`QcTaskList.vue`：`a-select` 绑 `filters.severity`，`a-pagination` 受控。

VLA seed：

```js
trajectory 禁止使用；统一写 telem:
telem: { qpos: [...], grip: [...], tsMs: joints.map((_,i)=>i*100), hz: 10 }
SCENE_OPTIONS 四值改为 aisle_pick/cold_lab/mezzanine/lobby_desk；更新手写 3 条任务的 scene 字段。
```

Train seed：`catalog`/`ckptList`/`evalGrid`/`cmMatrix`/`runLog`；`listExperiments` 过滤 `status`/`algorithm`。

媒体：

```bash
cd E:\omp\vla\vla-demo-antd
# generate-samples.mjs 内 brand='Orion'，colors 用 Ant 蓝系不同 hex，sine 频率 520+i*90
node scripts/generate-samples.mjs
```

校验与 Element 媒体哈希不同：

```powershell
Get-FileHash E:\omp\vla\vla-demo-element\public\samples\video\ep_01.mp4,
             E:\omp\vla\vla-demo-antd\public\samples\video\ep_01.mp4
```

- [ ] **Step 4: Run full Orion tests**

Run: `cd E:\omp\vla\vla-demo-antd && pnpm test`
Expected: 全绿；更新旧测试里对 `priority`/`dept`/`kitchen_counter`/`datasets`/`logs` 的引用。

- [ ] **Step 5: Commit**

```bash
git add vla-demo-antd
git commit -m "feat(antd): independent Orion thick seeds, paging, and sample media"
```

---

### Task 8: 灵眸（naive）独立 seed / 字段 / 媒体 / 分页

**Files:**
- Create: `vla-demo-naive/src/mock/seed/{prng,paginate,qc,prelabel,vla,train,media-manifest}.js`
- Create: `vla-demo-naive/scripts/generate-samples.mjs`（brand=`LingMou`，深色条纹背景）
- Modify: mock / services / views / specs（路径同 Task 7 结构，目录 `vla-demo-naive`）

**灵眸字段（必须按此命名）：**
- PRNG: `0x11A10E01`
- QC 优先级字段名 **`urgency`**，枚举 **`urgent`/`normal`/`backlog`**
- 组织：users **`squad`**（如 `具身数据中心` / `夜班标注舱` / `质检哨`）
- QC 附加：`lane`（`lane-alpha`/`lane-beta`/`lane-gamma`）
- 驳回链：`bounceLog: [{ at, by, code, note }]`
- VLA 场景：`stove_top`/`clean_bench`/`tote_wall`/`dual_monitor`
- 轨迹：`signal: { dof: number[][], claw: number[], t: number[], hz }`
- 训练：`corpora[]`（`part`/`tag`）、`snapshots[]`、`scoreSheet`、`mixMatrix`、`consoleLines[]`
- ID：`LM-` / `LM-VLA-` / `LM-TXT-` / `LM-IMG-` / `LM-EXP-` / `LM-ACC-`
- 列表 UI：Naive `n-pagination` + `n-select` 筛 `urgency`/`lane`/`scene`

- [ ] **Step 1: Write failing LingMou-specific tests**

```js
// vla-demo-naive/src/services/qc.list.spec.js
it('uses urgency/lane/squad and LM- ids', async () => {
  const { createInitialTasks } = await import('@/mock/qc')
  const tasks = createInitialTasks()
  expect(tasks.length).toBeGreaterThanOrEqual(50)
  expect(tasks.every((t) => t.id.startsWith('LM-'))).toBe(true)
  expect(tasks.every((t) => ['urgent','normal','backlog'].includes(t.urgency))).toBe(true)
  expect(tasks.every((t) => String(t.lane).startsWith('lane-'))).toBe(true)
  expect(tasks.some((t) => 'severity' in t || 'priority' in t)).toBe(false)
  const { users } = await import('@/mock/users')
  expect(users.every((u) => typeof u.squad === 'string')).toBe(true)
})
```

```js
// vla.list.spec.js 节选
expect(SCENE_OPTIONS.map((s) => s.value)).toEqual([
  'stove_top', 'clean_bench', 'tote_wall', 'dual_monitor',
])
expect(ep.signal.claw.length).toBe(ep.signal.t.length)
expect(ep).not.toHaveProperty('trajectory')
expect(ep).not.toHaveProperty('telem')
```

```js
// train.list.spec.js 节选
expect(e.corpora[0]).toEqual(expect.objectContaining({ part: expect.any(String), tag: expect.any(String) }))
expect(e.snapshots.length).toBeGreaterThanOrEqual(1)
expect(e.scoreSheet.length).toBeGreaterThanOrEqual(3)
expect(e.mixMatrix.length).toBeGreaterThanOrEqual(3)
expect(e.consoleLines.length).toBeGreaterThanOrEqual(30)
expect(e).not.toHaveProperty('catalog')
expect(e).not.toHaveProperty('datasets')
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd E:\omp\vla\vla-demo-naive && pnpm exec vitest run src/services/qc.list.spec.js src/services/vla.list.spec.js src/services/train.list.spec.js src/services/prelabel.list.spec.js`

- [ ] **Step 3: Implement**

Seed 示例（QC）：

```js
urgency: rng.pick(['urgent','normal','backlog']),
lane: rng.pick(['lane-alpha','lane-beta','lane-gamma']),
bounceLog: status==='rejected' ? [{ at:'2026-11-04 11:00:00', by:'u-lm-reviewer', code:'label_wrong', note:'边界漂移' }] : [],
```

VLA：`signal.dof` 为 `frames x 7`；媒体 `/samples/video/ep_0N.mp4` 由 LingMou 脚本生成（可用 `geq`/`noise` 滤镜制造与 Orion 不同的画面哈希）。

Train：`corpora`/`snapshots`/`scoreSheet`/`mixMatrix`/`consoleLines`；`listExperiments({ page, pageSize, status, algorithm })`。

Prelabel：`LM-TXT-`/`LM-IMG-` ≥50，保留 `LM-TXT-2026-001` 故意 ORG Diff；列表接 `n-pagination`。

- [ ] **Step 4: Run full Naive tests**

Run: `cd E:\omp\vla\vla-demo-naive && pnpm test`
Expected: PASS；修所有仍引用 `priority`/`dept`/`trajectory`/`datasets`/`logs` 的用例与视图列。

- [ ] **Step 5: Commit**

```bash
git add vla-demo-naive
git commit -m "feat(naive): independent LingMou thick seeds, paging, and sample media"
```

---

### Task 9: 星算（arco）独立 seed / 字段 / 媒体 / 分页

**Files:**
- Create: `vla-demo-arco/src/mock/seed/{prng,paginate,qc,prelabel,vla,train,media-manifest}.js`
- Create: `vla-demo-arco/scripts/generate-samples.mjs`（brand=`StarCompute`，青绿条）
- Modify: mock / services / views / specs

**星算字段（必须按此命名）：**
- PRNG: `0x5C010001`
- QC 优先级字段名 **`slaClass`**，枚举 **`S`/`A`/`B`**
- 组织：users **`pool`**（如 `算力调度中心` / `标注池-A` / `质检池`）
- QC 附加：`tenantCode`（`tn-sc-01`/`tn-sc-02`/`tn-sc-03`）
- 驳回链：`reworkTrail: [{ at, operatorId, reasonCode }]`
- VLA 场景：`pack_station`/`chem_hood`/`sku_cage`/`sit_stand`
- 轨迹：`stream: { joints: number[][], eeOpen: number[], stamp: number[], hz }`
- 训练：`repos[]`（`partition`/`pin`）、`weights[]`、`evalSheet`、`errorGrid`、`trainLog[]`
- ID：`SC-` / `SC-VLA-` / `SC-TXT-` / `SC-IMG-` / `SC-EXP-` / `SC-ACC-`
- 列表 UI：Arco `a-pagination` + 筛 `slaClass`/`tenantCode`/`scene`

- [ ] **Step 1: Write failing StarCompute-specific tests**

```js
it('uses slaClass/tenantCode/pool and SC- ids', async () => {
  const { createInitialTasks } = await import('@/mock/qc')
  const tasks = createInitialTasks()
  expect(tasks.length).toBeGreaterThanOrEqual(50)
  expect(tasks.every((t) => t.id.startsWith('SC-'))).toBe(true)
  expect(tasks.every((t) => ['S','A','B'].includes(t.slaClass))).toBe(true)
  expect(tasks.every((t) => String(t.tenantCode).startsWith('tn-sc-'))).toBe(true)
  const { users } = await import('@/mock/users')
  expect(users.every((u) => typeof u.pool === 'string')).toBe(true)
})
```

```js
expect(SCENE_OPTIONS.map((s) => s.value)).toEqual([
  'pack_station', 'chem_hood', 'sku_cage', 'sit_stand',
])
expect(ep.stream.eeOpen.length).toBe(ep.stream.stamp.length)
```

```js
expect(e.repos[0]).toEqual(expect.objectContaining({ partition: expect.any(String), pin: expect.any(String) }))
expect(e.weights.length).toBeGreaterThanOrEqual(1)
expect(e.evalSheet.length).toBeGreaterThanOrEqual(3)
expect(e.errorGrid.length).toBeGreaterThanOrEqual(3)
expect(e.trainLog.length).toBeGreaterThanOrEqual(30)
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd E:\omp\vla\vla-demo-arco && pnpm exec vitest run src/services/qc.list.spec.js src/services/vla.list.spec.js src/services/train.list.spec.js src/services/prelabel.list.spec.js`

- [ ] **Step 3: Implement**

```js
slaClass: rng.pick(['S','A','B']),
tenantCode: rng.pick(['tn-sc-01','tn-sc-02','tn-sc-03']),
reworkTrail: status==='rejected' ? [{ at:'2026-11-04 15:00:00', operatorId:'u-sc-reviewer', reasonCode:'spec_violate' }] : [],
```

Train 仪表盘向的文案保持星算语气（「算力池 / Checkpoint / 租户」）；`AlgoConfig.vue` 表列展示 `slaClass` 不展示 `priority`。

媒体：`brand='StarCompute'`，颜色 `#0fc6c2` 系；生成后哈希与 Element/Orion/LingMou 均不同。

- [ ] **Step 4: Run full Arco tests**

Run: `cd E:\omp\vla\vla-demo-arco && pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add vla-demo-arco
git commit -m "feat(arco): independent StarCompute thick seeds, paging, and sample media"
```

---

### Task 10: 录屏脚本「厚数据」段 + 验收清单 + 根 README

**Files:**
- Modify: `vla-demo-element/docs/record-script-datalink.md`
- Modify: `vla-demo-antd/docs/record-script-datalink.md`（若内容已是 Orion，可改名为 `record-script-orion.md` 并更新 README 链接；否则在原文件追加 Orion 厚数据段）
- Modify: `vla-demo-naive/docs/record-script-lingmou.md`
- Modify: `vla-demo-arco/docs/record-script-starcompute.md`
- Modify: `docs/superpowers/plans/acceptance-checklist.md`
- Modify: `README.md`

- [ ] **Step 1: 在验收清单追加 F 节（先写可勾选条目，作为验收「测试」）**

在 `acceptance-checklist.md` 末尾追加：

```markdown
## F. 厚数据与分页（对照 enrichment spec 2026-11-04）

| # | 检查项 | 5101 | 5102 | 5103 | 5104 | 通过 |
|---|--------|------|------|------|------|------|
| F1 | QC 可列表 ≥50，可按状态/模态/优先级等价字段筛选并翻页 | [ ] | [ ] | [ ] | [ ] | [ ] |
| F2 | 预标注文本与视觉列表 ≥50，保留故意 Diff | [ ] | [ ] | [ ] | [ ] | [ ] |
| F3 | VLA episode ≥50；详情含轨迹 JSON；视频非单一 bin_pick 共用 | [ ] | [ ] | [ ] | [ ] | [ ] |
| F4 | 训练实验 ≥50；详情含数据集 split/版本、checkpoint、验证表/混淆矩阵、长日志 | [ ] | [ ] | [ ] | [ ] | [ ] |
| F5 | 四套 seed/字段名互不共用（priority≠severity≠urgency≠slaClass 等） | [ ] | [ ] | [ ] | [ ] | [ ] |
| F6 | 非法页码回落第 1 页；空筛选 total=0 | [ ] | [ ] | [ ] | [ ] | [ ] |
| F7 | 各套 `public/samples` 新媒体可加载；跨套同名文件哈希不同 | [ ] | [ ] | [ ] | [ ] | [ ] |
```

- [ ] **Step 2: 各录屏脚本追加「厚数据」段落（完整可念词）**

数联示例（写入 `vla-demo-element/docs/record-script-datalink.md`）：

```markdown
## 厚数据加录（分页 / 筛选 / 详情）

1. 打开「质控工单列表」：展示总数 ≥50；筛选状态=已驳回、优先级=高；翻到第 2 页再回第 1 页。
2. 打开含 `rejectChain` 的驳回工单详情，读出驳回原因码。
3. 预标注文本列表翻页；点开 `DL-TXT-2026-001`，演示 ADDRESS 被标成 ORG 的 Diff 修正。
4. VLA 采集列表翻页；打开任一新 episode，播放 `ep_0N.mp4`（确认不是全员同一条料箱视频）；展开轨迹 JSON（joints / gripper / tSec）。
5. 训练实验列表筛选 status=finished；打开 `DL-EXP-2026-001`，展示 datasets.split/versionPin、checkpoints、valTable、confusionMatrix，滚动长日志。
```

Orion 段必须口述字段名 **severity / workspace / telem / catalog / ckptList**。  
灵眸段口述 **urgency / lane / signal / corpora / snapshots**。  
星算段口述 **slaClass / tenantCode / stream / repos / weights**。

- [ ] **Step 3: 根 README 追加指针**

在 `README.md`「设计文档」段落下追加：

```markdown
厚数据加厚规格：`docs/superpowers/specs/2026-11-04-vla-demo-data-enrichment-design.md`  
厚数据实现计划：`docs/superpowers/plans/2026-11-05-vla-demo-data-enrichment.md`
```

并在「测试与构建」附近加一句：各套 `pnpm test` 含 seed≥50 与分页筛选用例；媒体可用 `node scripts/generate-samples.mjs` 重生。

- [ ] **Step 4: 目视 diff（无自动测试）**

确认四份 record-script 均含「厚数据」标题；acceptance F1–F7 存在；README 双链存在。

- [ ] **Step 5: Commit**

```bash
git add README.md docs/superpowers/plans/acceptance-checklist.md \
  vla-demo-element/docs/record-script-datalink.md \
  vla-demo-antd/docs/record-script-datalink.md \
  vla-demo-naive/docs/record-script-lingmou.md \
  vla-demo-arco/docs/record-script-starcompute.md
git commit -m "docs: thick-data record scripts and acceptance checklist"
```

---

### Task 11: 四套 vitest + HTTP 5101–5104 冒烟

**Files:**
- 无新功能文件；可能修复 Task 2–9 遗漏的调用方
- 可选：`docs/superpowers/plans/acceptance-checklist.md` 勾选 E/F 的本地笔记（不强制提交勾选）

- [ ] **Step 1: 跑四套单测（作为回归门禁）**

```bash
cd E:\omp\vla\vla-demo-element && pnpm test
cd E:\omp\vla\vla-demo-antd && pnpm test
cd E:\omp\vla\vla-demo-naive && pnpm test
cd E:\omp\vla\vla-demo-arco && pnpm test
```

Expected: 四套均 exit 0。若失败，按失败用例回到对应 Task 修，不得删断言凑绿。

- [ ] **Step 2: 启动四套 dev server 并 HTTP 冒烟**

四个终端（或后台）：

```bash
cd E:\omp\vla\vla-demo-element && pnpm dev
cd E:\omp\vla\vla-demo-antd && pnpm dev
cd E:\omp\vla\vla-demo-naive && pnpm dev
cd E:\omp\vla\vla-demo-arco && pnpm dev
```

```powershell
foreach ($p in 5101,5102,5103,5104) {
  $r = Invoke-WebRequest -Uri "http://127.0.0.1:$p/" -UseBasicParsing -TimeoutSec 10
  Write-Host "$p $($r.StatusCode)"
}
```

Expected: 四行均为 `200`。

- [ ] **Step 3: 手工快速点检（每套 ≤2 分钟）**

- 列表翻页有数据  
- 筛一个无命中关键字见空态  
- VLA 详情能播 ep 视频  
- 训练详情看得见验证表字段  

- [ ] **Step 4: 媒体跨套哈希抽检**

```powershell
Get-FileHash E:\omp\vla\vla-demo-*\public\samples\video\ep_01.mp4 | Format-Table Hash, Path
```

Expected: 四个 Hash **互不相同**。

- [ ] **Step 5: Commit 仅当有冒烟修复**

```bash
# 若有修复：
git add -A
git commit -m "fix: stabilize thick-data paging callers after smoke"
# 若无改动可跳过 commit
```

---

## Self-review（对照 spec，写计划时已执行）

| Spec 要求 | 对应 Task |
|-----------|-----------|
| 每域 ≥50 + 分页 page/pageSize + 筛选 | T2–T5（Element）、T7–T9（三套） |
| 独立 seed + 固定 PRNG + 失败回退薄种子 | T1 helpers；T2–T5/T7–T9 try/catch fallback |
| 媒体新生成、时长对齐、跨套内容不同 | T6、T7–T9 generate-samples |
| VLA 轨迹 JSON；停止共用单 mp4 | T4、T7–T9 |
| 训练 dataset/split/checkpoint/验证表/混淆/长日志 | T5、T7–T9（键名按 vendor matrix） |
| 异厂商字段拉开、不共用 seed 文件 | Vendor matrix + T7–T9 禁止 cross-import |
| 非法页→1；空筛选 total=0；媒体缺失占位日志 | T1 paginate；T2/T6；验收 F6 |
| vitest + 5101–5104 冒烟 + 录屏厚数据段 | T10、T11 |
| 不接真后端、不缩评分点、仍在 feature 分支 | Global Constraints |

**Placeholder scan:** 无 TBD/TODO/「similar to Element」实现步骤；T7–T9 均写明独立字段名与测试断言。

**Type consistency:** 统一 PageResult=`{ items, total, page, pageSize }`；Element 轨迹键 `trajectory`；Orion `telem`；Naive `signal`；Arco `stream`——后序 Task 不得混用。

**Risky assumptions（执行前知悉）：**
1. 将 `list*` 从「返回数组」改为 PageResult，必须改全调用方（WorkflowBoard / Hub 下拉等），否则运行时 `.find` 崩溃。
2. Orion/灵眸/星算去掉 `priority`/`dept` 会触及表列与 `listMeta`；旧截图文案需同步。
3. `ffmpeg drawtext` 在部分 Windows 字体路径下失败 → 计划已允许去 drawtext 保哈希差异。
4. vitest 对 `scripts/*.spec.js` 默认包含与否取决于配置；若未收录，用 `pnpm exec vitest run scripts/generate-samples.spec.js` 显式跑。
5. 手写展示 ID 必须保留，否则既有 `vla.spec.js` / `prelabel.spec.js` 会红。

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-11-05-vla-demo-data-enrichment.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in-session with executing-plans and checkpoints  

Which approach?
