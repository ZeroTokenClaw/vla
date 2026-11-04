<script setup>
import { computed, ref } from 'vue'
import { useAuditStore } from '@/stores/audit'
import { copy } from '@/i18n/copy'

const audit = useAuditStore()
const expanded = ref(true)

const lines = computed(() => audit.entries.slice(0, 40))
</script>

<template>
  <div class="console" :class="{ collapsed: !expanded }">
    <div class="bar" @click="expanded = !expanded">
      <span class="dot" />
      <span class="title">Console / 操作流</span>
      <span class="count">{{ lines.length }}</span>
      <span class="toggle">{{ expanded ? '收起' : '展开' }}</span>
    </div>
    <div v-if="expanded" class="body">
      <div v-if="!lines.length" class="empty">{{ copy.empty.audit }}</div>
      <div v-for="e in lines" :key="e.id" class="line">
        <span class="ts">{{ e.at }}</span>
        <span class="act">{{ e.action }}</span>
        <span class="meta">{{ e.actor }} · {{ copy.roles[e.role] || e.role }}</span>
        <span v-if="e.detail" class="detail">{{ e.detail }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.console {
  border-top: 1px solid #1f1f28;
  background: #0a0a0e;
  font-family: "JetBrains Mono", "Cascadia Code", monospace;
  font-size: 12px;
  max-height: 180px;
  display: flex;
  flex-direction: column;
}
.console.collapsed {
  max-height: 34px;
}
.bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  cursor: pointer;
  color: #8b8b97;
  user-select: none;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #18a058;
  box-shadow: 0 0 8px #18a058;
}
.title {
  color: #63e2b7;
  font-weight: 600;
}
.count {
  background: #1a1a22;
  padding: 0 6px;
  border-radius: 4px;
}
.toggle {
  margin-left: auto;
}
.body {
  overflow: auto;
  padding: 0 14px 10px;
  flex: 1;
}
.empty {
  color: #6b6b76;
  padding: 6px 0;
}
.line {
  display: grid;
  grid-template-columns: 150px 120px 140px 1fr;
  gap: 8px;
  padding: 3px 0;
  border-bottom: 1px dashed #1a1a22;
  color: #c8c8d0;
}
.ts {
  color: #6b6b76;
}
.act {
  color: #63e2b7;
}
.meta {
  color: #8b8b97;
}
.detail {
  color: #a0a0aa;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 960px) {
  .line {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>
