<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { notification } from 'ant-design-vue'
import { listModels } from '@/services/factory'
import { listEvalModels, getEvalModel } from '@/services/evalBiz'
import { listMeta } from '@/services/train'

const router = useRouter()
const loading = ref(false)
const serviceRows = ref([])
const evalModels = ref([])
const meta = ref({ algorithms: [], gpus: [] })
const algo = ref(undefined)
const drawer = ref(false)
const detail = ref(null)

const metricEntries = computed(() => Object.entries(detail.value?.metrics || {}).map(([k, v]) => ({ key: k, value: v })))

async function load() {
  loading.value = true
  try {
    meta.value = listMeta()
    serviceRows.value = await listModels()
    const res = await listEvalModels({ algo: algo.value || undefined })
    evalModels.value = res.items
  } catch (e) {
    notification.error({ message: e.message, placement: 'topRight' })
  } finally {
    loading.value = false
  }
}

async function openDetail(id) {
  try {
    detail.value = await getEvalModel(id)
    drawer.value = true
  } catch (e) {
    notification.error({ message: e.message, placement: 'topRight' })
  }
}

onMounted(load)

const serviceCols = [
  { title: 'ID', dataIndex: 'id', width: 120 },
  { title: '名称', dataIndex: 'name' },
  { title: '任务', dataIndex: 'taskType', width: 100 },
  { title: '版本', dataIndex: 'version', width: 120 },
  { title: '框架', dataIndex: 'framework', width: 120 },
  { title: '状态', key: 'status', width: 100 },
  { title: '默认参数', key: 'params' },
  { title: '更新', dataIndex: 'updatedAt', width: 120 },
]

const evalCols = [
  { title: 'ID', dataIndex: 'id', width: 150, ellipsis: true },
  { title: '模型', dataIndex: 'name', width: 120 },
  { title: '版本', dataIndex: 'version', ellipsis: true },
  { title: '算法', dataIndex: 'algo', width: 110 },
  { title: '数据集', dataIndex: 'datasetId', width: 140 },
  { title: '参数量', dataIndex: 'params', width: 80 },
  { title: '主指标', key: 'metrics', width: 150 },
  { title: '状态', key: 'status', width: 80 },
  { title: '操作', key: 'ops', width: 90 },
]
</script>

<template>
  <div>
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="模型注册：推理服务表 + 评测版本登记表（假数据）。可打开详情查看 Case 分与 Changelog，并跳转多模型对比。"
    />

    <a-card title="推理服务注册表" size="small" style="margin-bottom: 12px">
      <a-table :loading="loading" :columns="serviceCols" :data-source="serviceRows" row-key="id" :pagination="false" size="small">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'active' ? 'success' : 'default'">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'params'">
            <code>{{ JSON.stringify(record.params) }}</code>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-card title="评测模型版本" size="small" style="margin-bottom: 12px">
      <a-space style="margin-bottom: 12px">
        <a-select
          v-model:value="algo"
          allow-clear
          placeholder="按算法筛选"
          style="width: 200px"
          :options="(meta.algorithms || []).map((a) => ({ label: a.label, value: a.value }))"
          @change="load"
        />
        <a-button type="primary" :loading="loading" @click="load">刷新</a-button>
        <a-button @click="router.push('/train/compare')">去多模型对比</a-button>
        <a-button @click="router.push('/train/lineage')">查看血缘</a-button>
      </a-space>
      <a-table :loading="loading" :columns="evalCols" :data-source="evalModels" row-key="id" size="small" :pagination="false">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'metrics'">
            <span v-if="record.metrics?.success != null">success={{ record.metrics.success }}</span>
            <span v-else-if="record.metrics?.map50 != null">mAP50={{ record.metrics.map50 }}</span>
            <span v-else-if="record.metrics?.f1 != null">F1={{ record.metrics.f1 }}</span>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag color="success">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'ops'">
            <a-button type="link" size="small" @click="openDetail(record.id)">详情</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-row :gutter="12">
      <a-col :span="14">
        <a-card title="算法目录" size="small">
          <a-table
            size="small"
            :pagination="false"
            row-key="value"
            :data-source="meta.algorithms || []"
            :columns="[
              { title: '编码', dataIndex: 'value', width: 140 },
              { title: '名称', dataIndex: 'label' },
              { title: '版本', key: 'versions' },
            ]"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'versions'">{{ (record.versions || []).join(', ') }}</template>
            </template>
          </a-table>
        </a-card>
      </a-col>
      <a-col :span="10">
        <a-card title="GPU 资源快照" size="small">
          <a-table
            size="small"
            :pagination="false"
            row-key="id"
            :data-source="meta.gpus || []"
            :columns="[
              { title: 'ID', dataIndex: 'id', width: 80 },
              { title: '名称', dataIndex: 'name' },
              { title: '显存', key: 'mem', width: 70 },
              { title: '空闲', key: 'free', width: 70 },
            ]"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'mem'">{{ record.memoryGb }}G</template>
              <template v-else-if="column.key === 'free'">
                <a-tag :color="record.free ? 'success' : 'warning'">{{ record.free ? '是' : '否' }}</a-tag>
              </template>
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>

    <a-drawer v-model:open="drawer" width="480" :title="detail ? `${detail.name} · ${detail.version}` : '详情'">
      <template v-if="detail">
        <a-descriptions :column="1" size="small" bordered style="margin-bottom: 12px">
          <a-descriptions-item label="ID">{{ detail.id }}</a-descriptions-item>
          <a-descriptions-item label="算法">{{ detail.algo }}</a-descriptions-item>
          <a-descriptions-item label="数据集">{{ detail.datasetId }}</a-descriptions-item>
          <a-descriptions-item label="参数量">{{ detail.params }}</a-descriptions-item>
          <a-descriptions-item label="负责人">{{ detail.owner || '—' }}</a-descriptions-item>
          <a-descriptions-item label="训练时间">{{ detail.trainedAt || '—' }}</a-descriptions-item>
          <a-descriptions-item label="状态">{{ detail.status }}</a-descriptions-item>
        </a-descriptions>

        <h4>完整指标</h4>
        <a-table
          size="small"
          :pagination="false"
          row-key="key"
          :data-source="metricEntries"
          :columns="[
            { title: '指标', dataIndex: 'key' },
            { title: '值', dataIndex: 'value' },
          ]"
        />

        <h4>Case 得分</h4>
        <a-table
          size="small"
          :pagination="false"
          row-key="caseId"
          :data-source="detail.caseScores || []"
          :columns="[
            { title: '用例', dataIndex: 'name' },
            { title: '分', dataIndex: 'score', width: 70 },
            { title: '备注', dataIndex: 'note', ellipsis: true },
          ]"
        />

        <h4>Changelog</h4>
        <a-timeline>
          <a-timeline-item v-for="(c, i) in detail.changelog || []" :key="i" color="green">{{ c }}</a-timeline-item>
        </a-timeline>
        <a-empty v-if="!(detail.changelog || []).length" description="无变更记录" />

        <a-space style="margin-top: 16px">
          <a-button @click="router.push('/system/datasets')">打开数据集</a-button>
          <a-button type="primary" @click="router.push('/train/compare')">去多模型对比</a-button>
        </a-space>
      </template>
    </a-drawer>
  </div>
</template>

<style scoped>
h4 { margin: 14px 0 8px; font-size: 14px; color: #334155; }
</style>
