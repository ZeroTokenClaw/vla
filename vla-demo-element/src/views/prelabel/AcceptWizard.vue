<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Select, Loading, Clock } from '@element-plus/icons-vue'
import {
  listAcceptJobs,
  getAcceptJob,
  advanceAcceptStep,
  ACCEPT_STEPS,
} from '@/services/prelabel'
import { useAuthStore } from '@/stores/auth'
import ProgressMock from '@/components/ProgressMock.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const jobs = ref([])
const filters = reactive({ keyword: '', status: '' })
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const job = ref(null)
const loading = ref(false)
const advancing = ref(false)
const qaNote = ref('')
const compareRows = ref([])

const currentId = computed(() => route.params.id)

function buildCompare(jobRow) {
  if (!jobRow) return []
  if (jobRow.sourceType === 'vision') {
    return [
      { field: 'OCR 文本「托盘」', model: '托盘', human: '托盘', conf: 0.91, status: '一致' },
      { field: 'OCR 文本「箱号」', model: 'B0X-11', human: 'BOX-11', conf: 0.62, status: '已修正' },
      { field: 'YOLO cup', model: 'cup@0.88', human: 'cup', conf: 0.88, status: '一致' },
      { field: 'YOLO tool', model: 'other@0.41', human: 'tool', conf: 0.41, status: '已修正' },
    ]
  }
  return [
    { field: '文本分类', model: '投诉-物流延误', human: '投诉-包裹破损', conf: 0.81, status: '已修正' },
    { field: '实体 ADDRESS', model: 'ORG', human: 'ADDRESS', conf: 0.72, status: '已修正' },
    { field: '关系 ORDER→ADDR', model: 'SHIPS_TO', human: 'RETURN_TO', conf: 0.61, status: '已修正' },
    { field: '实体 PERSON', model: 'PERSON', human: 'PERSON', conf: 0.94, status: '一致' },
  ]
}

const activeStepIndex = computed(() => {
  if (!job.value) return 0
  return ACCEPT_STEPS.findIndex((s) => s.key === job.value.step)
})

const canFinalAccept = computed(() => ['reviewer', 'admin'].includes(auth.role))

const currentStepMeta = computed(() => ACCEPT_STEPS[activeStepIndex.value] || ACCEPT_STEPS[0])

async function loadList() {
  const res = await listAcceptJobs({
    ...filters,
    page: page.value,
    pageSize: pageSize.value,
  })
  jobs.value = res.items
  total.value = res.total
  page.value = res.page
}

async function onSearch() {
  page.value = 1
  await loadList()
}

async function loadJob(id) {
  if (!id) {
    job.value = null
    return
  }
  loading.value = true
  try {
    job.value = await getAcceptJob(id)
    qaNote.value = job.value.qaNote || ''
    compareRows.value = buildCompare(job.value)
  } catch (e) {
    ElMessage.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadList()
  if (currentId.value) await loadJob(currentId.value)
  else if (jobs.value[0]) router.replace(`/prelabel/accept/${jobs.value[0].id}`)
})

watch(currentId, (id) => {
  if (id) loadJob(id)
})

function switchJob(id) {
  router.push(`/prelabel/accept/${id}`)
}

async function onAdvance() {
  if (!job.value) return
  if (job.value.status === 'accepted') {
    ElMessage.info('该任务已验收完成')
    return
  }
  if (job.value.step === 'accept' && !canFinalAccept.value) {
    ElMessage.warning('请切换为审核员或管理员后再最终验收')
    return
  }
  const stepLabel = currentStepMeta.value.label
  advancing.value = true
  try {
    job.value = await advanceAcceptStep(job.value.id, {
      qaNote: job.value.step === 'qa' ? qaNote.value : undefined,
    })
    if (job.value.status === 'accepted') {
      ElMessage.success('结果验收通过，已入库')
    } else {
      ElMessage.success(`已完成「${stepLabel}」，进入下一步`)
    }
    await loadList()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    advancing.value = false
  }
}

function stepStatus(key) {
  if (!job.value) return 'wait'
  if (job.value.stepDone.includes(key)) return 'success'
  if (job.value.step === key) return 'process'
  return 'wait'
}
</script>

<template>
  <div v-loading="loading" class="accept-wiz">
    <el-row :gutter="12">
      <el-col :span="6">
        <el-card shadow="never" class="side">
          <template #header>
            <div class="card-h">验收任务（{{ total }}）</div>
          </template>
          <div class="side-filters">
            <el-input v-model="filters.keyword" clearable size="small" placeholder="ID/标题" @keyup.enter="onSearch" />
            <el-select v-model="filters.status" clearable size="small" placeholder="状态" style="width: 100%; margin-top: 6px" @change="onSearch">
              <el-option label="进行中" value="in_progress" />
              <el-option label="已验收" value="accepted" />
            </el-select>
            <el-button size="small" type="primary" style="width: 100%; margin-top: 6px" @click="onSearch">筛选</el-button>
          </div>
          <el-menu :default-active="currentId" @select="switchJob">
            <el-menu-item v-for="j in jobs" :key="j.id" :index="j.id">
              <div class="doc-item">
                <div class="doc-id">{{ j.id }}</div>
                <div class="doc-title">{{ j.title }}</div>
                <el-tag
                  size="small"
                  :type="j.status === 'accepted' ? 'success' : 'warning'"
                >
                  {{ j.status === 'accepted' ? '已验收' : j.step }}
                </el-tag>
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

      <el-col :span="18">
        <el-card shadow="never">
          <div class="toolbar">
            <div>
              <div class="title">{{ job?.title || '选择验收任务' }}</div>
              <div class="meta" v-if="job">
                来源 {{ job.sourceType }} / {{ job.sourceId }}
                <template v-if="job.acceptedAt">
                  · 验收人 {{ job.acceptedBy }} · {{ job.acceptedAt }}
                </template>
              </div>
            </div>
            <el-tag v-if="job" :type="job.status === 'accepted' ? 'success' : 'warning'">
              {{ job.status === 'accepted' ? '已验收' : '进行中' }}
            </el-tag>
          </div>

          <el-steps :active="activeStepIndex" finish-status="success" align-center class="steps">
            <el-step
              v-for="s in ACCEPT_STEPS"
              :key="s.key"
              :title="s.label"
              :description="s.desc"
              :status="stepStatus(s.key) === 'success' ? 'success' : undefined"
            />
          </el-steps>

          <ProgressMock :running="advancing" label="步骤处理中…" :duration="700" />

          <el-card shadow="never" class="step-card" v-if="job">
            <h3>{{ currentStepMeta.label }}</h3>
            <p class="desc">{{ currentStepMeta.desc }}</p>

            <ul class="checklist">
              <li v-for="s in ACCEPT_STEPS" :key="s.key">
                <el-icon v-if="job.stepDone.includes(s.key)" color="#52c41a"><Select /></el-icon>
                <el-icon v-else-if="job.step === s.key" color="#1677ff"><Loading /></el-icon>
                <el-icon v-else color="#d1d5db"><Clock /></el-icon>
                <span :class="{ done: job.stepDone.includes(s.key), current: job.step === s.key }">
                  {{ s.label }}
                </span>
              </li>
            </ul>

            <div v-if="job.step === 'confirm'" class="hint">
              请确认预标注结果与业务样例一致，确认后进入人工精标。
              <el-table :data="compareRows" size="small" stripe class="cmp" style="margin-top: 12px">
                <el-table-column prop="field" label="字段" min-width="140" />
                <el-table-column prop="model" label="模型结果" min-width="120" />
                <el-table-column prop="human" label="人工最终" min-width="120" />
                <el-table-column prop="conf" label="置信度" width="90" />
                <el-table-column prop="status" label="对照" width="90">
                  <template #default="{ row }">
                    <el-tag size="small" :type="row.status === '一致' ? 'success' : 'warning'">
                      {{ row.status }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <div v-else-if="job.step === 'annotate'" class="hint">
              请在「文本预标 / 视觉预标」页完成人工修正后，回到本向导继续。
              <div class="links">
                <el-button link type="primary" @click="router.push('/prelabel/text')">打开文本预标</el-button>
                <el-button link type="primary" @click="router.push('/prelabel/vision')">打开视觉预标</el-button>
              </div>
              <el-table :data="compareRows" size="small" stripe class="cmp" style="margin-top: 12px">
                <el-table-column prop="field" label="字段" min-width="140" />
                <el-table-column prop="model" label="预标" min-width="120" />
                <el-table-column prop="human" label="精标后" min-width="120" />
                <el-table-column prop="status" label="Diff" width="90" />
              </el-table>
            </div>
            <div v-else-if="job.step === 'qa'" class="hint">
              <div class="label">质检意见</div>
              <el-input
                v-model="qaNote"
                type="textarea"
                :rows="3"
                placeholder="例如：实体类型已修正，关系抽取合格，允许验收"
              />
              <p class="qa-sum">
                Diff 摘要：一致
                {{ compareRows.filter((r) => r.status === '一致').length }} /
                已修正 {{ compareRows.filter((r) => r.status === '已修正').length }}
              </p>
            </div>
            <div v-else class="hint">
              <el-alert
                :type="canFinalAccept ? 'success' : 'warning'"
                :closable="false"
                :title="
                  canFinalAccept
                    ? `当前角色「${auth.role}」可执行最终验收`
                    : '当前为标注员，请切换审核员/管理员后验收'
                "
              />
            </div>

            <div class="footer">
              <el-button
                type="primary"
                :loading="advancing"
                :disabled="job.status === 'accepted'"
                @click="onAdvance"
              >
                {{ job.step === 'accept' ? '确认验收通过' : '完成本步并继续' }}
              </el-button>
            </div>
          </el-card>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.qa-sum {
  margin: 8px 0 0;
  font-size: 12px;
  color: #6b7280;
}
.cmp {
  width: 100%;
}
.side {
  min-height: 520px;
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
  margin-bottom: 2px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
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
.steps {
  margin: 8px 0 20px;
}
.step-card {
  background: #fafafa;
}
.step-card h3 {
  margin: 0 0 6px;
}
.desc {
  margin: 0 0 12px;
  color: #6b7280;
  font-size: 13px;
}
.checklist {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.checklist li {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.checklist .done {
  color: #52c41a;
  font-weight: 600;
}
.checklist .current {
  color: #1677ff;
  font-weight: 600;
}
.hint {
  margin-bottom: 16px;
  font-size: 13px;
  color: #374151;
}
.label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}
.links {
  margin-top: 8px;
}
.footer {
  display: flex;
  justify-content: flex-end;
}
</style>
