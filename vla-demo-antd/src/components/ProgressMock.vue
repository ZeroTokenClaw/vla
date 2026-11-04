<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  running: { type: Boolean, default: false },
  label: { type: String, default: '处理中…' },
  duration: { type: Number, default: 900 },
})

const percent = ref(0)
let timer = null

watch(
  () => props.running,
  (v) => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    if (!v) {
      percent.value = 0
      return
    }
    percent.value = 8
    const step = Math.max(4, Math.floor(100 / (props.duration / 80)))
    timer = setInterval(() => {
      if (percent.value >= 92) return
      percent.value = Math.min(92, percent.value + step)
    }, 80)
  },
)

defineExpose({
  finish() {
    percent.value = 100
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  },
})
</script>

<template>
  <div v-if="running || percent > 0" class="pm">
    <div class="pm-label">{{ label }} {{ percent }}%</div>
    <a-progress :percent="percent" :stroke-width="10" status="active" />
  </div>
</template>

<style scoped>
.pm {
  margin: 8px 0 12px;
}
.pm-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}
</style>
