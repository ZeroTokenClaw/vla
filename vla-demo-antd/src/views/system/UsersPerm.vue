<script setup>
import { computed, reactive, ref } from 'vue'
import { notification } from 'ant-design-vue'
import { users, roleOptions } from '@/mock/users'
import { copy } from '@/i18n/copy'

const matrix = [
  { action: '创建生产任务 / 编排发布', annotator: false, reviewer: false, admin: true },
  { action: '标注保存 / 提交审核', annotator: true, reviewer: true, admin: true },
  { action: '一级审核通过/驳回', annotator: false, reviewer: true, admin: true },
  { action: '终审通过', annotator: false, reviewer: false, admin: true },
  { action: '抽检回流', annotator: false, reviewer: true, admin: true },
  { action: '训练启停 / GPU 分配', annotator: false, reviewer: false, admin: true },
  { action: '导出数据集 / 审计日志', annotator: false, reviewer: true, admin: true },
  { action: '模型注册 / 评测对比', annotator: false, reviewer: false, admin: true },
  { action: '场景方案库编辑', annotator: true, reviewer: true, admin: true },
  { action: '异常标不合格 / 过滤', annotator: true, reviewer: true, admin: true },
]

const sessions = ref([
  { id: 'SES-01', user: '周明轩', role: 'admin', ip: '10.0.0.12', device: 'Chrome / Win', since: '2026-11-09 08:01', active: true },
  { id: 'SES-02', user: '林晓萱', role: 'reviewer', ip: '10.0.0.21', device: 'Edge / Win', since: '2026-11-09 08:05', active: true },
  { id: 'SES-03', user: '陈思远', role: 'annotator', ip: '10.0.0.33', device: 'Chrome / macOS', since: '2026-11-09 08:12', active: true },
  { id: 'SES-04', user: '赵雨桐', role: 'annotator', ip: '10.0.0.44', device: 'Firefox / Win', since: '2026-11-08 19:40', active: false },
])

const draft = reactive({ name: '', account: '', role: 'annotator', team: '标注一组' })
const open = ref(false)
const localUsers = ref(users.map((u) => ({ ...u })))

const roleCount = computed(() => {
  const m = { admin: 0, reviewer: 0, annotator: 0 }
  for (const u of localUsers.value) m[u.role] = (m[u.role] || 0) + 1
  return m
})

function addUser() {
  if (!draft.name.trim() || !draft.account.trim()) {
    notification.warning({ message: '请填写姓名与账号', placement: 'topRight' })
    return
  }
  localUsers.value.unshift({
    id: `U-DEMO-${Date.now()}`,
    name: draft.name,
    account: draft.account,
    role: draft.role,
    team: draft.team,
  })
  open.value = false
  draft.name = ''
  draft.account = ''
  notification.success({ message: '演示账号已加入本地列表（不落库）', placement: 'topRight' })
}

function kick(id) {
  const s = sessions.value.find((x) => x.id === id)
  if (s) s.active = false
  notification.info({ message: `已强制下线 ${id}（演示）`, placement: 'topRight' })
}

const userCols = [
  { title: '用户', dataIndex: 'name' },
  { title: '账号', dataIndex: 'account' },
  { title: '角色', key: 'role' },
  { title: '团队', dataIndex: 'team' },
]
const matrixCols = [
  { title: '操作', dataIndex: 'action' },
  { title: 'Annotator', key: 'annotator', width: 110 },
  { title: 'Reviewer', key: 'reviewer', width: 110 },
  { title: 'Admin', key: 'admin', width: 110 },
]
</script>

<template>
  <div>
    <a-alert type="info" show-icon style="margin-bottom: 12px" message="演示权限：顶栏角色切换；本页展示 RBAC 矩阵、会话与本地账号伪造视图，无真实登录鉴权。" />
    <a-row :gutter="12" style="margin-bottom: 12px">
      <a-col :span="6"><a-statistic title="账号数" :value="localUsers.length" /></a-col>
      <a-col :span="6"><a-statistic title="Admin" :value="roleCount.admin" /></a-col>
      <a-col :span="6"><a-statistic title="Reviewer" :value="roleCount.reviewer" /></a-col>
      <a-col :span="6"><a-statistic title="在线会话" :value="sessions.filter((s) => s.active).length" /></a-col>
    </a-row>

    <a-row :gutter="12">
      <a-col :span="10">
        <a-card title="演示账号">
          <template #extra>
            <a-button type="link" size="small" @click="open = true">新增</a-button>
          </template>
          <a-table :columns="userCols" :data-source="localUsers" :pagination="false" row-key="id" size="small">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'role'">
                <a-tag :color="record.role === 'admin' ? 'purple' : record.role === 'reviewer' ? 'blue' : 'default'">
                  {{ copy.roles[record.role] || record.role }}
                </a-tag>
              </template>
            </template>
          </a-table>
          <a-divider />
          <div>可选角色：{{ roleOptions.map((r) => copy.roles[r.value]).join(' / ') }}</div>
        </a-card>
      </a-col>
      <a-col :span="14">
        <a-card title="权限矩阵">
          <a-table :columns="matrixCols" :data-source="matrix" :pagination="false" row-key="action" size="small">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'annotator' || column.key === 'reviewer' || column.key === 'admin'">
                <a-tag :color="record[column.key] ? 'success' : 'default'">{{ record[column.key] ? '允许' : '拒绝' }}</a-tag>
              </template>
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>

    <a-card title="活跃会话（伪造）" size="small" style="margin-top: 12px">
      <a-table
        size="small"
        row-key="id"
        :pagination="false"
        :data-source="sessions"
        :columns="[
          { title: '会话', dataIndex: 'id', width: 90 },
          { title: '用户', dataIndex: 'user', width: 90 },
          { title: '角色', dataIndex: 'role', width: 100 },
          { title: 'IP', dataIndex: 'ip', width: 120 },
          { title: '终端', dataIndex: 'device' },
          { title: '登录于', dataIndex: 'since', width: 150 },
          { title: '状态', key: 'active', width: 90 },
          { title: '操作', key: 'op', width: 100 },
        ]"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'active'">
            <a-tag :color="record.active ? 'success' : 'default'">{{ record.active ? '在线' : '已下线' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'op'">
            <a-button type="link" size="small" :disabled="!record.active" @click="kick(record.id)">强制下线</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal v-model:open="open" title="新增演示账号" @ok="addUser">
      <a-form layout="vertical">
        <a-form-item label="姓名"><a-input v-model:value="draft.name" /></a-form-item>
        <a-form-item label="账号"><a-input v-model:value="draft.account" /></a-form-item>
        <a-form-item label="角色">
          <a-select v-model:value="draft.role" :options="roleOptions.map((r) => ({ value: r.value, label: copy.roles[r.value] || r.value }))" />
        </a-form-item>
        <a-form-item label="团队"><a-input v-model:value="draft.team" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
