<script setup>
import { Message } from '@/ui/discrete'
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
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
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
    pageSize.value = res.pageSize
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
    Message.error(e.message || '加载失败')
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
    Message.success('文本预标管线完成：分类 / NER / 关系 / 结构化')
    await loadList()
  } catch (e) {
    Message.error(e.message)
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
    Message.error('结构化 JSON 格式不正确')
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
    Message.success(`已保存人工修正${changedFields.value.length ? '：' + changedFields.value.join('、') : ''}`)
    await loadDoc(doc.value.id)
    changedFields.value = res.changedFields || []
    await loadList()
  } catch (e) {
    Message.error(e.message)
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
  <div class="text-pre">
    <a-row :gutter="12">
      <a-col :span="5">
        <a-card class="side">
          <template #title>
            <div class="card-h">文本样例</div>
          </template>
          <a-menu @menu-item-click="switchDoc">
            <a-menu-item v-for="d in docs" :key="d.id">
              <div class="doc-item">
                <div class="doc-id">{{ d.id }}</div>
                <div class="doc-title">{{ d.title }}</div>
                <a-tag v-if="d.hasCorrection" size="small" color="green">已修正</a-tag>
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
              <a-button status="success" :loading="saving" :disabled="!doc" @click="onSave">保存人工修正</a-button>
            </div>
          </div>
          <ProgressMock :running="running" label="文本分类 / NER / 关系抽取 / 结构化输出…" />

          <a-alert
            v-if="changedFields.length"
            type="success"
            :closable="false"
            show-icon
            class="diff-alert"
            :title="`已高亮变更字段：${changedFields.join('、')}`"
          />

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
                  <a-select v-model="draft.classifyLabel" style="width: 100%">
                    <a-option v-for="c in meta.classLabels" :key="c" :label="c" :value="c" />
                  </a-select>
                </div>

                <div :class="['block', fieldClass('entities')]">
                  <div class="label-row">
                    <span class="label">实体识别 NER</span>
                    <a-button  type="text" @click="addEntity">新增</a-button>
                  </div>
                  <div v-for="e in draft.entities" :key="e.id" class="row-edit">
                    <a-input v-model="e.text" size="small" style="width: 90px" />
                    <a-select v-model="e.type" size="small" style="width: 110px">
                      <a-option v-for="t in meta.entityTypes" :key="t" :label="t" :value="t" />
                    </a-select>
                    <a-button  type="text" @click="removeEntity(e.id)">删</a-button>
                  </div>
                </div>

                <div :class="['block', fieldClass('relations')]">
                  <div class="label-row">
                    <span class="label">关系抽取</span>
                    <a-button  type="text" @click="addRelation">新增</a-button>
                  </div>
                  <div v-for="r in draft.relations" :key="r.id" class="row-edit">
                    <a-input v-model="r.head" size="small" style="width: 70px" placeholder="head" />
                    <a-select v-model="r.type" size="small" style="width: 130px">
                      <a-option v-for="t in meta.relationTypes" :key="t" :label="t" :value="t" />
                    </a-select>
                    <a-input v-model="r.tail" size="small" style="width: 70px" placeholder="tail" />
                    <a-button  type="text" @click="removeRelation(r.id)">删</a-button>
                  </div>
                </div>

                <div :class="['block', fieldClass('structured')]">
                  <div class="label">结构化结果 JSON</div>
                  <a-textarea v-model="draft.structuredJson"  :rows="8" />
                </div>
              </div>
            </a-col>
          </a-row>
        </a-card>
      </a-col>
    </a-row>
  </div>
  <div class="pager">
    <a-pagination v-model:current="page" v-model:page-size="pageSize" :total="total" show-total show-page-size :page-size-options="[10,20,50]" />
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
.pager { display:flex; justify-content:flex-end; margin-top:12px; }
</style>
