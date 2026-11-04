import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        { path: '', name: 'home', component: () => import('@/views/Home.vue') },
        { path: 'qc', name: 'qc', component: () => import('@/views/Placeholder.vue'), meta: { title: '质控中心' } },
        { path: 'prelabel', name: 'prelabel', component: () => import('@/views/Placeholder.vue'), meta: { title: '智能预标' } },
        { path: 'vla', name: 'vla', component: () => import('@/views/Placeholder.vue'), meta: { title: '具身采集标注' } },
        { path: 'train', name: 'train', component: () => import('@/views/Placeholder.vue'), meta: { title: '算法工场' } },
      ],
    },
  ],
})

export default router
