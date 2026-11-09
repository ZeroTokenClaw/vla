<script setup>
import { message } from '@/ui/discrete'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  listTextDocs,
  getTextDoc,
  runTextPipeline,
  saveCorrection,
  listMeta,
} from '@/services/prelabel'
import ProgressMock from '@/components/ProgressMock.vue'

const route = useRoute()
const router = useRouter()

const docs = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const doc = ref(null)
const loading = ref(false)
const running = ref(false)
const saving = ref(false)
const pipelineResult = ref(null)
const changedFields = ref([])
const meta = listMeta()

const draft = ref({
  classifyLabel: '',
  entities: [],
  relations: [],
  structuredJson: '',
})

const currentId = computed(() => route.params.id)

async function loadList() {
  const res = await listTextDocs({ page: page.value, pageSize: pageSize.value })
  docs.value = res.items
  total.value = res.total
  page.value = res.page
}

async function loadDoc(id) {
  if (!id) {
    doc.value = null
    return
  }
  loading.value = true
  try {
    doc.value = await getTextDoc(id)
    pipelineResult.value = doc.value.model
    applyDraft(doc.value.corrected || doc.value.model)
    changedFields.value = []
  } catch (e) {
    message.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function applyDraft(model) {
  draft.value = {
    classifyLabel: model.classify?.label || '',
    entities: JSON.parse(JSON.stringify(model.entities || [])),
    relations: JSON.parse(JSON.stringify(model.relations || [])),
    structuredJson: JSON.stringify(model.structured || {}, null, 2),
  }
}

onMounted(async () => {
  await loadList()
  if (currentId.value) await loadDoc(currentId.value)
  else if (docs.value[0]) router.replace(`/prelabel/text/${docs.value[0].id}`)
})

watch(currentId, (id) => {
  if (id) loadDoc(id)
})

function switchDoc(id) {
  router.push(`/prelabel/text/${id}`)
}

async function onRun() {
  if (!doc.value) return
  running.value = true
  try {
    pipelineResult.value = await runTextPipeline(doc.value.id)
    applyDraft(pipelineResult.value)
    changedFields.value = []
    message.success('文本预标管线完成：分类 / NER / 关系 / 结构化')
    await loadList()
  } catch (e) {
    message.error(e.message)
  } finally {
    running.value = false
  }
}

function removeEntity(id) {
  draft.value.entities = draft.value.entities.filter((e) => e.id !== id)
}

function addEntity() {
  draft.value.entities.push({
    id: `te-new-${Date.now()}`,
    text: '新实体',
    type: meta.entityTypes[0],
    start: 0,
    end: 2,
    conf: 1,
  })
}

function removeRelation(id) {
  draft.value.relations = draft.value.relations.filter((r) => r.id !== id)
}

function addRelation() {
  const ents = draft.value.entities
  draft.value.relations.push({
    id: `tr-new-${Date.now()}`,
    head: ents[0]?.id || '',
    tail: ents[1]?.id || ents[0]?.id || '',
    type: meta.relationTypes[0],
    conf: 1,
  })
}

async function onSave() {
  if (!doc.value) return
  let structured
  try {
    structured = JSON.parse(draft.value.structuredJson)
  } catch {
    message.error('结构化 JSON 格式不正确')
    return
  }
  saving.value = true
  try {
    const res = await saveCorrection(doc.value.id, {
      classify: { label: draft.value.classifyLabel, conf: 1 },
      entities: draft.value.entities,
      relations: draft.value.relations,
      structured,
    })
    changedFields.value = res.changedFields || []
    message.success(`已保存人工修正${changedFields.value.length ? '：' + changedFields.value.join('、') : ''}`)
    await loadDoc(doc.value.id)
    changedFields.value = res.changedFields || []
    await loadList()
  } catch (e) {
    message.error(e.message)
  } finally {
    saving.value = false
  }
}

const modelJson = computed(() => JSON.stringify(pipelineResult.value || {}, null, 2))

const entityStats = computed(() => {
  const map = {}
  for (const e of draft.value.entities || []) map[e.type] = (map[e.type] || 0) + 1
  return Object.entries(map).map(([type, count]) => ({ type, count }))
})

const lowConfEntities = computed(() =>
  (draft.value.entities || []).filter((e) => e.conf != null && Number(e.conf) < 0.75),
)

const diffRows = computed(() => {
  if (!doc.value || !pipelineResult.value) return []
  const model = pipelineResult.value
  const gold = doc.value.goldHint || {}
  const rows = []
  const draftCls = draft.value.classifyLabel
  const modelCls = model.classify?.label
  if (modelCls || draftCls) {
    rows.push({
      field: '文本分类',
      model: modelCls || '—',
      draft: draftCls || '—',
      hint: gold.classify || '—',
      status: draftCls && modelCls && draftCls !== modelCls ? '已修正' : '一致',
    })
  }
  for (const e of model.entities || []) {
    const draftEnt = (draft.value.entities || []).find((x) => x.id === e.id)
    const fix = gold.entityFix?.[e.id]
    const status =
      fix && draftEnt && draftEnt.type === fix
        ? '已修正'
        : draftEnt && draftEnt.type !== e.type
          ? '草稿差异'
          : '一致'
    rows.push({
      field: `实体 ${e.text}`,
      model: e.type,
      draft: draftEnt?.type || '—',
      hint: fix || '—',
      status,
    })
  }
  for (const r of model.relations || []) {
    const draftRel = (draft.value.relations || []).find((x) => x.id === r.id)
    const fix = gold.relationFix?.[r.id]
    rows.push({
      field: `关系 ${r.head}→${r.tail}`,
      model: r.type,
      draft: draftRel?.type || '—',
      hint: fix || '—',
      status: fix && draftRel?.type === fix ? '已修正' : draftRel && draftRel.type !== r.type ? '草稿差异' : '一致',
    })
  }
  if (gold.note) {
    rows.push({ field: '备注', model: '—', draft: '—', hint: gold.note, status: '提示' })
  }
  return rows
})

function fieldClass(name) {
  return changedFields.value.includes(name) ? 'field-changed' : ''
}
</script>

<template>
  <div class="text-pre">
    <n-grid cols="24"  x-gap="12" y-gap="12">
      <n-gi :span="5">
        <n-card class="side">
          <template #header>
            <div class="card-h">文本样例</div>
          </template>
          <n-empty v-if="!docs.length" description="暂无样例" size="small" />
          <div
            v-for="d in docs"
            :key="d.id"
            class="side-item"
            :class="{ active: route.params.id === d.id }"
            @click="router.push('/prelabel/text/' + d.id)"
          >
            <div class="side-id">{{ d.id }}</div>
            <div class="side-title">{{ d.title }}</div>
            <div class="side-meta">
              <n-tag size="tiny" :bordered="false">{{ d.status }}</n-tag>
              <n-tag v-if="d.hasCorrection" size="tiny" type="success" :bordered="false">已修正</n-tag>
              <span v-if="d.progressPct != null">{{ d.progressPct }}%</span>
            </div>
          </div>
          <div style="margin-top:12px;display:flex;justify-content:flex-end">
            <n-pagination
              v-model:page="page"
              v-model:page-size="pageSize"
              :item-count="total"
              size="small"
              :page-slot="5"
              @update:page="loadList"
              @update:page-size="() => { page.value = 1; loadList() }"
            />
          </div>
        </n-card>
      </n-gi>

      <n-gi :span="19">
        <n-card>
          <div class="toolbar">
            <div>
              <div class="title">{{ doc?.title || '选择样例' }}</div>
              <div class="meta" v-if="doc">批次 {{ doc.batchId }} · {{ doc.status }}</div>
            </div>
            <div class="actions">
              <n-button type="primary" :loading="running" @click="onRun">运行文本预标管线</n-button>
              <n-button type="success" :loading="saving" :disabled="!doc" @click="onSave">保存人工修正</n-button>
            </div>
          </div>
          <ProgressMock :running="running" label="文本分类 / NER / 关系抽取 / 结构化输出…" />

          <n-alert
            v-if="changedFields.length"
            type="success"
            :closable="false"
            show-icon
            class="diff-alert"
            :title="`已高亮变更字段：${changedFields.join('、')}`"
          />

          <div v-if="doc" class="sum-bar">
            <n-tag :bordered="false">实体 {{ draft.entities.length }}</n-tag>
            <n-tag :bordered="false">关系 {{ draft.relations.length }}</n-tag>
            <n-tag type="warning" :bordered="false">低置信 {{ lowConfEntities.length }}</n-tag>
            <n-tag v-for="s in entityStats" :key="s.type" size="small" type="info" :bordered="false">
              {{ s.type }} · {{ s.count }}
            </n-tag>
          </div>

          <n-card v-if="diffRows.length" size="small" title="模型 vs 人工 Diff（演示）" :bordered="false" class="diff-card">
            <n-data-table
              size="small"
              :data="diffRows"
              :columns="[
                { title: '字段', key: 'field', width: 140 },
                { title: '模型', key: 'model' },
                { title: '当前草稿', key: 'draft' },
                { title: '金标准提示', key: 'hint' },
                {
                  title: '状态',
                  key: 'status',
                  width: 90,
                  render: (r) => r.status,
                },
              ]"
            />
          </n-card>

          <n-grid cols="24"  x-gap="12" y-gap="12" class="tri">
            <n-gi :span="8">
              <div class="pane-title">原始文本 · 实体高亮</div>
              <div class="pane raw">
                <template v-if="draft.entities?.length">
                  <p class="hl-hint">共 {{ draft.entities.length }} 实体 / {{ draft.relations.length }} 关系 · 分类：{{ draft.classifyLabel || '—' }}</p>
                  <div class="chip-wrap">
                    <n-tag
                      v-for="e in draft.entities"
                      :key="e.id"
                      size="small"
                      :bordered="false"
                      type="info"
                      class="chip"
                    >
                      {{ e.text }}
                      <span class="chip-t">{{ e.type }}</span>
                      <span v-if="e.conf != null" class="chip-c">{{ Number(e.conf).toFixed(2) }}</span>
                    </n-tag>
                  </div>
                </template>
                <div class="raw-body">{{ doc?.rawText }}</div>
              </div>
            </n-gi>
            <n-gi :span="8">
              <div class="pane-title">模型 JSON</div>
              <pre class="pane code">{{ modelJson }}</pre>
            </n-gi>
            <n-gi :span="8">
              <div class="pane-title">人工编辑器</div>
              <div class="pane editor">
                <div :class="['block', fieldClass('classify')]">
                  <div class="label">文本分类</div>
                  <n-select v-model="draft.classifyLabel" style="width: 100%" :options="meta.classLabels.map(c => ({ label: c, value: c }))"></n-select>
                </div>

                <div :class="['block', fieldClass('entities')]">
                  <div class="label-row">
                    <span class="label">实体识别 NER</span>
                    <n-button text type="primary" @click="addEntity">新增</n-button>
                  </div>
                  <div v-for="e in draft.entities" :key="e.id" class="row-edit">
                    <n-input v-model="e.text" size="small" style="width: 90px" />
                    <n-select v-model="e.type" size="small" style="width: 110px" :options="meta.entityTypes.map(t => ({ label: t, value: t }))"></n-select>
                    <n-button text type="error" @click="removeEntity(e.id)">删</n-button>
                  </div>
                </div>

                <div :class="['block', fieldClass('relations')]">
                  <div class="label-row">
                    <span class="label">关系抽取</span>
                    <n-button text type="primary" @click="addRelation">新增</n-button>
                  </div>
                  <div v-for="r in draft.relations" :key="r.id" class="row-edit">
                    <n-input v-model="r.head" size="small" style="width: 70px" placeholder="head" />
                    <n-select v-model="r.type" size="small" style="width: 130px" :options="meta.relationTypes.map(t => ({ label: t, value: t }))"></n-select>
                    <n-input v-model="r.tail" size="small" style="width: 70px" placeholder="tail" />
                    <n-button text type="error" @click="removeRelation(r.id)">删</n-button>
                  </div>
                </div>

                <div :class="['block', fieldClass('structured')]">
                  <div class="label">结构化结果 JSON</div>
                  <n-input v-model="draft.structuredJson" type="textarea" :rows="8" />
                </div>
              </div>
            </n-gi>
          </n-grid>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<style scoped>
.side {
  min-height: 560px;
}
.card-h {
  font-weight: 600;
}
.doc-item {
  line-height: 1.3;
  white-space: normal;
}
.doc-id {
  font-size: 11px;
  color: #6b7280;
}
.doc-title {
  font-size: 13px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  gap: 12px;
}
.title {
  font-size: 16px;
  font-weight: 600;
}
.meta {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}
.actions {
  display: flex;
  gap: 8px;
}
.diff-card { margin-bottom: 12px; background: #14141c; }
.diff-alert {
  margin-bottom: 10px;
}
.sum-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.tri {
  margin-top: 4px;
}
.pane-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #374151;
}
.pane {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 10px;
  min-height: 480px;
  font-size: 13px;
  line-height: 1.6;
  overflow: auto;
}
.pane.raw {
  white-space: pre-wrap;
}
.pane.code {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}
.pane.editor {
  background: #fff;
}
.block {
  margin-bottom: 14px;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid transparent;
}
.field-changed {
  border-color: #95de64;
  background: #f6ffed;
}
.label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
  display: block;
}
.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.row-edit {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.side-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 6px;
  border: 1px solid transparent;
}
.side-item:hover { background: #f5f5f5; }
.side-item.active { background: #eef3ff; border-color: #c3d4ff; }
.side-id { font-size: 11px; color: #6b7280; }
.side-title { font-size: 13px; }
.side-meta {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 4px;
  font-size: 11px;
  color: #6b7280;
}
.hl-hint { margin: 0 0 8px; font-size: 12px; color: #6b7280; }
.chip-wrap { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.chip-t { margin-left: 4px; opacity: 0.75; }
.chip-c { margin-left: 4px; color: #18a058; font-weight: 600; }
.raw-body { white-space: pre-wrap; }
</style>
