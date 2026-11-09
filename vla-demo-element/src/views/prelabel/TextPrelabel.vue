<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
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
const filters = reactive({ keyword: '', status: '', batchId: '' })
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
const textModelId = ref(meta.models.find((m) => m.type === 'text_pipeline')?.id || '')
const confThres = ref(0.55)
const lastRunMeta = ref(null)

const draft = ref({
  classifyLabel: '',
  entities: [],
  relations: [],
  structuredJson: '',
})

const currentId = computed(() => route.params.id)

async function loadList() {
  const res = await listTextDocs({
    ...filters,
    page: page.value,
    pageSize: pageSize.value,
  })
  docs.value = res.items
  total.value = res.total
  page.value = res.page
}

async function onSearch() {
  page.value = 1
  await loadList()
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
    ElMessage.error(e.message || '加载失败')
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
    const res = await runTextPipeline(doc.value.id, {
      modelId: textModelId.value,
      params: { confThres: confThres.value, maxLen: 512 },
    })
    pipelineResult.value = res
    lastRunMeta.value = { modelId: res.modelId, modelVersion: res.modelVersion }
    applyDraft(pipelineResult.value)
    changedFields.value = []
    ElMessage.success(`文本预标完成 · ${res.modelId}@${res.modelVersion}`)
    await loadList()
  } catch (e) {
    ElMessage.error(e.message)
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
    ElMessage.error('结构化 JSON 格式不正确')
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
    ElMessage.success(`已保存人工修正${changedFields.value.length ? '：' + changedFields.value.join('、') : ''}`)
    await loadDoc(doc.value.id)
    changedFields.value = res.changedFields || []
    await loadList()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}

const modelJson = computed(() => JSON.stringify(pipelineResult.value || {}, null, 2))

function fieldClass(name) {
  return changedFields.value.includes(name) ? 'field-changed' : ''
}
</script>

<template>
  <div v-loading="loading" class="text-pre">
    <el-row :gutter="12">
      <el-col :span="5">
        <el-card shadow="never" class="side">
          <template #header>
            <div class="card-h">文本样例（{{ total }}）</div>
          </template>
          <div class="side-filters">
            <el-input v-model="filters.keyword" clearable size="small" placeholder="ID/标题" @keyup.enter="onSearch" />
            <el-select v-model="filters.status" clearable size="small" placeholder="状态" style="width: 100%; margin-top: 6px" @change="onSearch">
              <el-option label="ready" value="ready" />
              <el-option label="running" value="running" />
              <el-option label="corrected" value="corrected" />
              <el-option label="accepted" value="accepted" />
              <el-option label="prelabeled" value="prelabeled" />
            </el-select>
            <el-input v-model="filters.batchId" clearable size="small" placeholder="批次号" style="margin-top: 6px" @keyup.enter="onSearch" />
            <el-button size="small" type="primary" style="width: 100%; margin-top: 6px" @click="onSearch">筛选</el-button>
          </div>
          <el-menu :default-active="currentId" @select="switchDoc">
            <el-menu-item v-for="d in docs" :key="d.id" :index="d.id">
              <div class="doc-item">
                <div class="doc-id">{{ d.id }}</div>
                <div class="doc-title">{{ d.title }}</div>
                <div class="doc-meta">{{ d.progressPct ?? 0 }}% · {{ d.spotCheckPass === false ? '抽检未过' : '抽检OK' }}</div>
                <el-tag v-if="d.hasCorrection" size="small" type="success">已修正</el-tag>
              </div>
            </el-menu-item>
          </el-menu>
          <div class="pager">
            <el-pagination
              v-model:current-page="page"
              v-model:page-size="pageSize"
              :total="total"
              layout="total, prev, pager, next"
              :pager-count="5"
              small
              @current-change="loadList"
              @size-change="() => { page = 1; loadList() }"
            />
          </div>
        </el-card>
      </el-col>

      <el-col :span="19">
        <el-card shadow="never">
          <div class="toolbar">
            <div>
              <div class="title">{{ doc?.title || '选择样例' }}</div>
              <div class="meta" v-if="doc">
                批次 {{ doc.batchId }} · {{ doc.status }}
                <span v-if="lastRunMeta"> · 模型 {{ lastRunMeta.modelId }}@{{ lastRunMeta.modelVersion }}</span>
              </div>
            </div>
            <div class="actions">
              <el-select v-model="textModelId" size="small" style="width: 220px" placeholder="选择 NLP 模型">
                <el-option
                  v-for="m in meta.models.filter((x) => x.type === 'text_pipeline')"
                  :key="m.id"
                  :label="`${m.name} ${m.version}`"
                  :value="m.id"
                />
              </el-select>
              <el-input-number v-model="confThres" size="small" :min="0.1" :max="0.95" :step="0.05" />
              <el-button type="primary" :loading="running" @click="onRun">运行文本预标管线</el-button>
              <el-button type="success" :loading="saving" :disabled="!doc" @click="onSave">保存人工修正</el-button>
            </div>
          </div>
          <ProgressMock :running="running" label="文本分类 / NER / 关系抽取 / 结构化输出…" />

          <el-alert
            v-if="changedFields.length"
            type="success"
            :closable="false"
            show-icon
            class="diff-alert"
            :title="`已高亮变更字段：${changedFields.join('、')}`"
          />

          <el-row :gutter="12" class="tri">
            <el-col :span="8">
              <div class="pane-title">原始文本</div>
              <div class="pane raw">{{ doc?.rawText }}</div>
            </el-col>
            <el-col :span="8">
              <div class="pane-title">模型 JSON</div>
              <pre class="pane code">{{ modelJson }}</pre>
            </el-col>
            <el-col :span="8">
              <div class="pane-title">人工编辑器</div>
              <div class="pane editor">
                <div :class="['block', fieldClass('classify')]">
                  <div class="label">文本分类</div>
                  <el-select v-model="draft.classifyLabel" style="width: 100%">
                    <el-option v-for="c in meta.classLabels" :key="c" :label="c" :value="c" />
                  </el-select>
                </div>

                <div :class="['block', fieldClass('entities')]">
                  <div class="label-row">
                    <span class="label">实体识别 NER</span>
                    <el-button link type="primary" @click="addEntity">新增</el-button>
                  </div>
                  <div v-for="e in draft.entities" :key="e.id" class="row-edit">
                    <el-input v-model="e.text" size="small" style="width: 90px" />
                    <el-select v-model="e.type" size="small" style="width: 110px">
                      <el-option v-for="t in meta.entityTypes" :key="t" :label="t" :value="t" />
                    </el-select>
                    <el-button link type="danger" @click="removeEntity(e.id)">删</el-button>
                  </div>
                </div>

                <div :class="['block', fieldClass('relations')]">
                  <div class="label-row">
                    <span class="label">关系抽取</span>
                    <el-button link type="primary" @click="addRelation">新增</el-button>
                  </div>
                  <div v-for="r in draft.relations" :key="r.id" class="row-edit">
                    <el-input v-model="r.head" size="small" style="width: 70px" placeholder="head" />
                    <el-select v-model="r.type" size="small" style="width: 130px">
                      <el-option v-for="t in meta.relationTypes" :key="t" :label="t" :value="t" />
                    </el-select>
                    <el-input v-model="r.tail" size="small" style="width: 70px" placeholder="tail" />
                    <el-button link type="danger" @click="removeRelation(r.id)">删</el-button>
                  </div>
                </div>

                <div :class="['block', fieldClass('structured')]">
                  <div class="label">结构化结果 JSON</div>
                  <el-input v-model="draft.structuredJson" type="textarea" :rows="8" />
                </div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.side {
  min-height: 560px;
}
.card-h {
  font-weight: 600;
}
.side-filters {
  padding: 0 8px 8px;
}
.pager {
  padding: 8px 4px 4px;
  display: flex;
  justify-content: center;
}
.doc-meta {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
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
.diff-alert {
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
</style>
