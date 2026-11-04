<script setup>
import { useRouter } from 'vue-router'
import { copy } from '@/i18n/copy'

const router = useRouter()

const sessions = [
  {
    id: 'LM-SESS-09A3',
    title: '仓拣-红盒抓取放置',
    module: copy.modules.vla,
    path: '/vla/timeline/LM-VLA-2026-001',
    at: '2026-11-04 13:42:18',
    frames: 120,
    keyframes: 4,
    status: '标注中',
    tone: 'warning',
  },
  {
    id: 'LM-SESS-07C1',
    title: '厨房台面擦拭序列',
    module: copy.modules.vla,
    path: '/vla/collect',
    at: '2026-11-04 11:05:02',
    frames: 96,
    keyframes: 3,
    status: '待采集',
    tone: 'info',
  },
  {
    id: 'LM-QC-20261104-001',
    title: '语音切片关键帧抽检',
    module: copy.modules.qc,
    path: '/qc',
    at: '2026-11-04 10:22:41',
    frames: 48,
    keyframes: 6,
    status: '质控中',
    tone: 'success',
  },
  {
    id: 'LM-TXT-2026-001',
    title: '预标引擎 · 客服语料修正',
    module: copy.modules.prelabel,
    path: '/prelabel/text',
    at: '2026-11-03 19:18:00',
    frames: 0,
    keyframes: 0,
    status: '可修正',
    tone: 'default',
  },
]
</script>

<template>
  <div class="home">
    <div class="hero">
      <div>
        <div class="eyebrow">SESSION TIMELINE</div>
        <h2>{{ copy.home.title }}</h2>
        <p class="sub">{{ copy.home.subtitle }}</p>
      </div>
      <n-button type="primary" @click="router.push('/vla/collect')">新建采集会话</n-button>
    </div>

    <n-card class="panel" :bordered="false">
      <n-empty v-if="!sessions.length" :description="copy.empty.sessions" />
      <n-timeline v-else>
        <n-timeline-item
          v-for="s in sessions"
          :key="s.id"
          :type="s.tone === 'default' ? 'default' : s.tone"
          :title="s.title"
        >
          <template #header>
            <div class="sess-head">
              <code>{{ s.id }}</code>
              <n-tag size="tiny" :type="s.tone === 'default' ? 'default' : s.tone" :bordered="false">
                {{ s.status }}
              </n-tag>
            </div>
          </template>
          <div class="sess-body">
            <div class="meta">
              <span>{{ s.at }}</span>
              <span>{{ s.module }}</span>
              <span v-if="s.frames">{{ s.frames }} 帧 · {{ s.keyframes }} {{ copy.terms.keyframe }}</span>
            </div>
            <n-button size="small" quaternary type="primary" @click="router.push(s.path)">
              打开会话
            </n-button>
          </div>
        </n-timeline-item>
      </n-timeline>
    </n-card>
  </div>
</template>

<style scoped>
.hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: 0.16em;
  color: #63e2b7;
}
h2 {
  margin: 8px 0 0;
  font-size: 22px;
}
.sub {
  margin: 8px 0 0;
  color: #8b8b97;
  max-width: 560px;
  font-size: 13px;
}
.panel {
  background: #14141a !important;
  border: 1px solid #22222c !important;
  border-radius: 14px;
}
.sess-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
code {
  font-size: 12px;
  color: #63e2b7;
  background: #0c1f16;
  padding: 2px 8px;
  border-radius: 6px;
}
.sess-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #8b8b97;
  font-size: 12px;
}
</style>
