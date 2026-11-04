<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { path: '/prelabel/text', label: 'Text 文本', match: (p) => p.startsWith('/prelabel/text') || p === '/prelabel' },
  { path: '/prelabel/vision', label: 'Vision 视觉', match: (p) => p.startsWith('/prelabel/vision') },
  { path: '/prelabel/accept', label: 'Accept 验收', match: (p) => p.startsWith('/prelabel/accept') },
]

const activeTab = computed(() => {
  const hit = tabs.find((t) => t.match(route.path))
  return hit?.path || '/prelabel/text'
})

function onTabClick({ key }) {
  router.push(key)
}
</script>

<template>
  <div class="pre-hub">
    <div class="pre-head">
      <div>
        <h2>Prelabel Studio</h2>
        <p class="sub">Model proposals · human correction · acceptance</p>
      </div>
    </div>

    <a-menu
      :key="activeTab"
      mode="horizontal"
      
      
      class="pre-tabs"
      :selected-keys="[activeTab]" @click="onTabClick">
      <a-menu-item v-for="t in tabs" :key="t.path">{{ t.label }}</a-menu-item>
    </a-menu>

    <-view />
  </div>
</template>

<style scoped>
.pre-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}
h2 {
  margin: 0;
  font-size: 20px;
}
.sub {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
}
.pre-tabs {
  margin-bottom: 12px;
  background: #fff;
  border-radius: 6px;
  padding: 0 8px;
}
</style>
