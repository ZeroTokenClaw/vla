<script setup>import { notification } from 'ant-design-vue'

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
    notification.error({ message: e.message || '加载失败', placement: 'topRight' })
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
    notification.success({ message: '文本预标管线完成：分类 / NER / 关系 / 结构化', placement: 'topRight' })
    await loadList()
  } catch (e) {
    notification.error({ message: e.message, placement: 'topRight' })
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
    notification.error({ message: '结构化 JSON 格式不正确', placement: 'topRight' })
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
    notification.success({ message: `已保存人工修正${changedFields.value.length ? '：' + changedFields.value.join('、') : ''}`, placement: 'topRight' })
    await loadDoc(doc.value.id)
    changedFields.value = res.changedFields || []
    await loadList()
  } catch (e) {
    notification.error({ message: e.message, placement: 'topRight' })
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
  <div :loading="loading" class="text-pre">
    <a-row :gutter="12">
      <a-col :span="5">
        <a-card  class="side">
          <template #title>
            <div class="card-h">文本样例</div>
          </template>
          <a-menu :selected-keys="currentId" @click="switchDoc">
            <a-menu-item v-for="d in docs" :key="d.id" :index="d.id">
              <div class="doc-item">
                <div class="doc-id">{{ d.id }}</div>
                <div class="doc-title">{{ d.title }}</div>
                <a-tag v-if="d.hasCorrection" size="small" color="success">已修正</a-tag>
              </div>
            </a-menu-item>
          </a-menu>
        </a-card>
      </a-col>

      <a-col :span="19">
        <a-card>
          <div class="toolbar">
            <div>
              <div class="title">{{ doc?.title || '选择样例' }}</div>
              <div class="meta" v-if="doc">批次 {{ doc.batchId }} · {{ doc.status }}</div>
            </div>
            <div class="actions">
              <a-button type="primary" :loading="running" @click="onRun">运行文本预标管线</a-button>
              <a-button type="success" :loading="saving" :disabled="!doc" @click="onSave">保存人工修正</a-button>
            </div>
          </div>
          <ProgressMock :running="running" label="文本分类 / NER / 关系抽取 / 结构化输出…" />

          <a-alert
            v-if="changedFields.length"
            type="success"
            :closable="false"
            show-icon
            class="diff-alert"
            :message="`已高亮变更字段：${changedFields.join('、')}`" />

          <a-row :gutter="12" class="tri">
            <a-col :span="8">
              <div class="pane-title">原始文本</div>
              <div class="pane raw">{{ doc?.rawText }}</div>
            </a-col>
            <a-col :span="8">
              <div class="pane-title">模型 JSON</div>
              <pre class="pane code">{{ modelJson }}</pre>
            </a-col>
            <a-col :span="8">
              <div class="pane-title">人工编辑器</div>
              <div class="pane editor">
                <div :class="['block', fieldClass('classify')]">
                  <div class="label">文本分类</div>
                  <a-select v-model:value="draft.classifyLabel" style="width: 100%">
                    <a-select-option v-for="c in meta.classLabels" :key="c" :value="c">{{ c }}</a-select-option>
                  </a-select>
                </div>

                <div :class="['block', fieldClass('entities')]">
                  <div class="label-row">
                    <span class="label">实体识别 NER</span>
                    <a-button type="link" @click="addEntity">新增</a-button>
                  </div>
                  <div v-for="e in draft.entities" :key="e.id" class="row-edit">
                    <a-input v-model:value="e.text" size="small" style="width: 90px" />
                    <a-select v-model:value="e.type" size="small" style="width: 100px">
                      <a-select-option v-for="t in meta.entityTypes" :key="t" :value="t">{{ t }}</a-select-option>
                    </a-select>
                    <a-tooltip title="模型置信度（可改）">
                      <a-progress
                        type="circle"
                        :percent="Math.round((e.conf ?? 0.8) * 100)"
                        :width="28"
                        :stroke-color="(e.conf ?? 0.8) >= 0.8 ? '#52c41a' : '#faad14'"
                      />
                    </a-tooltip>
                    <a-button type="link" danger @click="removeEntity(e.id)">删</a-button>
                  </div>
                  <div v-if="pipelineResult?.entities?.length" class="diff-mini">
                    <div class="label">模型 vs 人工 Diff（实体数）</div>
                    <a-tag>模型 {{ pipelineResult.entities.length }}</a-tag>
                    <a-tag color="processing">人工 {{ draft.entities.length }}</a-tag>
                    <a-tag color="warning">
                      Δ {{ draft.entities.length - pipelineResult.entities.length }}
                    </a-tag>
                  </div>
                </div>

                <div :class="['block', fieldClass('relations')]">
                  <div class="label-row">
                    <span class="label">关系抽取</span>
                    <a-button  type="link" @click="addRelation">新增</a-button>
                  </div>
                  <div v-for="r in draft.relations" :key="r.id" class="row-edit">
                    <a-input v-model:value="r.head" size="small" style="width: 70px" placeholder="head" />
                    <a-select v-model:value="r.type" size="small" style="width: 130px">
                      <a-select-option v-for="t in meta.relationTypes" :key="t" :value="t">{{ t }}</a-select-option>
                    </a-select>
                    <a-input v-model:value="r.tail" size="small" style="width: 70px" placeholder="tail" />
                    <a-button  type="link" danger @click="removeRelation(r.id)">删</a-button>
                  </div>
                </div>

                <div :class="['block', fieldClass('structured')]">
                  <div class="label">结构化结果 JSON</div>
                  <a-textarea v-model:value="draft.structuredJson"  :rows="8" />
                </div>
              </div>
            </a-col>
          </a-row>
        </a-card>
      </a-col>
    </a-row>
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
.diff-mini {
  margin-top: 8px;
  padding: 6px 8px;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 12px;
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
