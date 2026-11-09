<script setup>
import { computed, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NTag } from 'naive-ui'
import { copy } from '@/i18n/copy'
import { getDashboardStats } from '@/services/analytics'
import { useAuditStore } from '@/stores/audit'
import { message } from '@/ui/discrete'

const router = useRouter()
const audit = useAuditStore()
const loading = ref(false)
const stats = ref(null)

const shortcuts = [
  { label: '多模态画像', path: '/analytics/profile', group: '分析' },
  { label: '质量评分', path: '/analytics/quality-score', group: '分析' },
  { label: '异常分析', path: '/analytics/anomaly', group: '分析' },
  { label: '数据集', path: '/datasets', group: '数据' },
  { label: '标注工作台', path: '/qc/annotate', group: '标注' },
  { label: '预标队列', path: '/prelabel/jobs', group: '预标' },
  { label: '设备台账', path: '/vla/devices', group: 'VLA' },
  { label: 'VLA 联动标注', path: '/vla/timeline', group: 'VLA' },
  { label: '动作序列分析', path: '/vla/action-analysis', group: 'VLA' },
  { label: '指令一致性', path: '/vla/consistency', group: 'VLA' },
  { label: '多模型评测', path: '/eval/compare', group: '评测' },
  { label: '算力监控', path: '/train/gpus', group: '训练' },
  { label: '数据-模型追溯', path: '/lineage', group: '评测' },
  { label: '训练监控', path: '/train/runner', group: '训练' },
]

const recentEvents = computed(() => audit.entries.slice(0, 8))

const anomalyCols = [
  { title: '工单', key: 'id', width: 130 },
  { title: '样本', key: 'sampleName', ellipsis: { tooltip: true } },
  {
    title: '类型',
    key: 'issueType',
    width: 90,
    render: (r) => h(NTag, { size: 'tiny', type: 'warning', bordered: false }, { default: () => r.issueType }),
  },
  { title: '严重度', key: 'severity', width: 80 },
  {
    title: '处理',
    key: 'act',
    width: 80,
    render: () =>
      h(
        NButton,
        { size: 'tiny', quaternary: true, type: 'primary', onClick: () => router.push('/analytics/anomaly') },
        { default: () => '去处理' },
      ),
  },
]

async function load() {
  loading.value = true
  try {
    stats.value = await getDashboardStats()
  } catch (e) {
    message.error(e.message || '驾驶舱加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="home">
    <div class="hero">
      <div>
        <div class="eyebrow">EIDE · DATA INTELLIGENCE</div>
        <h2>{{ copy.home.title }}</h2>
        <p class="sub">{{ copy.home.subtitle }}</p>
        <n-space>
          <n-tag size="small" type="warning" :bordered="false">
            {{ stats?.banner || '演示假数据模式' }}
          </n-tag>
          <n-tag size="small" :bordered="false">生成 {{ stats?.generatedAt || '—' }}</n-tag>
        </n-space>
      </div>
      <div class="hero-actions">
        <n-button :loading="loading" @click="load">刷新指标</n-button>
        <n-button type="primary" @click="router.push('/analytics/profile')">进入数据分析</n-button>
      </div>
    </div>

    <n-spin :show="loading">
      <div class="kpi-grid">
        <n-card
          v-for="k in stats?.kpis || []"
          :key="k.key"
          class="kpi"
          :bordered="false"
          size="small"
        >
          <div class="kpi-label">{{ k.label }}</div>
          <div class="kpi-value">{{ k.value }}{{ k.unit || '' }}</div>
          <div v-if="k.delta" class="kpi-delta">{{ k.delta }}</div>
        </n-card>
      </div>

      <div class="brief" v-if="stats?.todayBrief">
        <n-card size="small" :bordered="false"><div class="k">今日入库</div><div class="v">{{ stats.todayBrief.ingest }}</div></n-card>
        <n-card size="small" :bordered="false"><div class="k">今日标注</div><div class="v">{{ stats.todayBrief.annotated }}</div></n-card>
        <n-card size="small" :bordered="false"><div class="k">今日通过</div><div class="v">{{ stats.todayBrief.passed }}</div></n-card>
        <n-card size="small" :bordered="false"><div class="k">异常修复</div><div class="v">{{ stats.todayBrief.anomalyFixed }}</div></n-card>
        <n-card size="small" :bordered="false"><div class="k">训练 epoch</div><div class="v">{{ stats.todayBrief.trainEpochs }}</div></n-card>
      </div>

      <n-card title="业务流水线（演示）" :bordered="false" class="mb">
        <div class="pipe">
          <div v-for="p in stats?.pipeline || []" :key="p.stage" class="pipe-node" :class="p.status">
            <div class="ps">{{ p.stage }}</div>
            <div class="pc">{{ p.count }}</div>
            <div class="pt">{{ p.status === 'warn' ? '关注' : p.status === 'busy' ? '忙碌' : '正常' }}</div>
          </div>
        </div>
      </n-card>
    </n-spin>

    <div class="mid">
      <n-card class="panel" title="快捷入口" :bordered="false">
        <div class="shortcuts">
          <n-button v-for="s in shortcuts" :key="s.path" secondary @click="router.push(s.path)">
            <span class="sg">{{ s.group }}</span>{{ s.label }}
          </n-button>
        </div>
      </n-card>
      <n-card class="panel" title="待处理异常（Top）" :bordered="false">
        <n-data-table
          size="small"
          :bordered="false"
          :data="stats?.recentAnomalies || []"
          :columns="anomalyCols"
          :max-height="220"
        />
        <n-button class="mt" text type="primary" @click="router.push('/analytics/anomaly')">
          打开异常分析中心 →
        </n-button>
      </n-card>
    </div>

    <div class="mid mt-panel">
      <n-card class="panel" title="标注模态分布" :bordered="false">
        <div v-for="m in stats?.modalityBreakdown || []" :key="m.code" class="mod-row">
          <span>{{ m.name }}</span>
          <n-progress
            type="line"
            :percentage="stats?.kpis?.[0]?.value ? Math.round((m.count / Math.max(1, stats.kpis[0].value)) * 100) : 0"
            :show-indicator="false"
          />
          <span class="cnt">{{ m.count }}</span>
        </div>
        <n-empty v-if="!(stats?.modalityBreakdown || []).length" description="暂无模态统计" />
      </n-card>
      <n-card class="panel" title="最近操作流" :bordered="false">
        <div v-if="!recentEvents.length" class="empty-ev">暂无操作记录，进入各业务页操作后将出现在此</div>
        <div v-for="e in recentEvents" :key="e.id" class="ev">
          <span class="ts">{{ e.at }}</span>
          <span class="act">{{ e.action }}</span>
          <span class="meta">{{ e.actor }} · {{ e.detail || '—' }}</span>
        </div>
      </n-card>
    </div>
    <p class="hint">source_mode={{ stats?.sourceMode || 'demo' }} · 非真实算法/训练结果</p>
  </div>
</template>

<style scoped>
.home { max-width: 1200px; }
.hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: 0.12em;
  color: #63e2b7;
  margin-bottom: 6px;
}
h2 { margin: 0 0 8px; font-size: 22px; }
.sub { margin: 0 0 10px; color: #9a9aab; max-width: 560px; }
.hero-actions { display: flex; gap: 8px; flex-shrink: 0; }
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}
.kpi { background: #14141c; }
.kpi-label { color: #8b8b9a; font-size: 12px; }
.kpi-value { margin-top: 6px; font-size: 22px; font-weight: 600; color: #63e2b7; }
.kpi-delta { margin-top: 4px; font-size: 11px; color: #6e6e7a; }
.brief {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}
.brief .k { color: #8b8b9a; font-size: 12px; }
.brief .v { margin-top: 4px; font-size: 18px; color: #c8c8d0; font-weight: 600; }
.brief :deep(.n-card) { background: #14141c; }
.mb { margin-bottom: 12px; background: #14141c; }
.pipe { display: flex; gap: 8px; flex-wrap: wrap; }
.pipe-node {
  flex: 1;
  min-width: 110px;
  background: #101018;
  border: 1px solid #2a2a36;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
}
.pipe-node.warn { border-color: #f0a020; }
.pipe-node.busy { border-color: #70c0e8; }
.ps { font-size: 12px; color: #8b8b9a; }
.pc { font-size: 20px; color: #63e2b7; font-weight: 700; margin: 4px 0; }
.pt { font-size: 11px; color: #6e6e7a; }
.mid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 12px; }
.panel { background: #14141c; }
.shortcuts { display: flex; flex-wrap: wrap; gap: 8px; }
.sg { opacity: 0.55; margin-right: 6px; font-size: 11px; }
.mt { margin-top: 8px; }
.mt-panel { margin-top: 12px; }
.mod-row {
  display: grid;
  grid-template-columns: 90px 1fr 36px;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: #c8c8d0;
}
.cnt { text-align: right; color: #8b8b9a; }
.empty-ev { color: #6e6e7a; font-size: 12px; }
.ev {
  display: grid;
  grid-template-columns: 150px 180px 1fr;
  gap: 8px;
  font-size: 12px;
  padding: 4px 0;
  border-bottom: 1px solid #1f1f28;
  font-family: "JetBrains Mono", "Cascadia Code", monospace;
}
.ts { color: #6e6e7a; }
.act { color: #63e2b7; }
.meta { color: #a0a0aa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hint { margin: 12px 0 0; color: #6e6e7a; font-size: 12px; }
@media (max-width: 900px) {
  .mid, .brief { grid-template-columns: 1fr; }
  .ev { grid-template-columns: 1fr; }
}
</style>
