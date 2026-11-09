<script setup>import { notification } from 'ant-design-vue'

import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import ProgressMock from '@/components/ProgressMock.vue'
import {
  listMeta,
  listVlaTasks,
  createCollectTask,
} from '@/services/vla'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const tasks = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const filters = reactive({ status: undefined, scene: undefined, keyword: '' })
const meta = reactive({
  modes: [],
  scenes: [],
  plans: [],
  actionTemplates: [],
  personnel: [],
})

const formRef = ref()
const form = reactive({
  name: '',
  scene: '',
  plan: '',
  mode: '',
  actionTemplateIds: [],
  personnelIds: [],
  instruction: '',
})

const formRules = {
  name: [{ required: true, message: '璇峰～鍐欎换鍔″悕绉?, trigger: 'blur' }],
  scene: [{ required: true, message: '璇烽€夋嫨鍦烘櫙淇℃伅', trigger: 'change' }],
  plan: [{ required: true, message: '璇烽€夋嫨閲囬泦鏂规', trigger: 'change' }],
  mode: [{ required: true, message: '璇烽€夋嫨閲囬泦妯″紡', trigger: 'change' }],
  actionTemplateIds: [{ type: 'array', required: true, min: 1, message: '璇烽€夋嫨鍔ㄤ綔妯℃澘', trigger: 'change' }],
  personnelIds: [{ type: 'array', required: true, min: 1, message: '璇烽厤缃噰闆嗕汉鍛?, trigger: 'change' }],
}

async function refresh() {
  loading.value = true
  try {
    const m = listMeta()
    Object.assign(meta, m)
    const res = await listVlaTasks({ ...filters, page: page.value, pageSize: pageSize.value })
    tasks.value = res.items
    total.value = res.total
    page.value = res.page
  } finally {
    loading.value = false
  }
}

async function onSubmit() {
  const ok = await formRef.value?.validate().catch(() => false)
  if (!ok) {
    notification.error({ message: '璇峰厛瀹屾暣濉啓蹇呭～椤癸紙绾㈣壊鏍￠獙鎻愮ず锛?, placement: 'topRight' })
    return
  }

  saving.value = true
  try {
    const task = await createCollectTask({ ...form })
    notification.success({ message: `宸插垱寤洪噰闆嗕换鍔?${task.id}`, placement: 'topRight' })
    form.name = ''
    form.instruction = ''
    form.actionTemplateIds = []
    form.personnelIds = []
    await refresh()
    router.push(`/vla/timeline/${task.id}`)
  } catch (e) {
    notification.error({ message: e.message || '鍒涘缓澶辫触', placement: 'topRight' })
  } finally {
    saving.value = false
  }
}

function goAnnotate(id) {
  router.push(`/vla/timeline/${id}`)
}

function goQuality(id) {
  router.push(`/vla/quality/${id}`)
}

function labelOf(list, value) {
  return list.find((x) => x.value === value)?.label || value
}

onMounted(refresh)

function mapTagColor(t) {
  const m = { danger: 'error', warning: 'warning', success: 'success', info: 'default', primary: 'processing', '': 'default' }
  return m[t] || t || 'default'
}

const ornTableCols1 = [
  { title: '浠诲姟鍙?, key: 'id', dataIndex: 'id', width: 150 },
  { title: '妯″紡', key: '妯″紡', width: 110 },
  { title: '鍔ㄤ綔鏁?, key: 'actionCount', dataIndex: 'actionCount', width: 70 },
  { title: '鎿嶄綔', key: '鎿嶄綔', width: 170, fixed: 'right' }
]
</script>

<template>
  <div :loading="loading" class="collect">
    <a-row :gutter="16">
      <a-col :span="10">
        <a-card  class="card">
          <template #title>
            <div class="card-head">
              <span>鏂板缓閲囬泦浠诲姟</span>
              <a-tag size="small" type="primary">閰嶇疆椤?2.5 鍒?/a-tag>
            </div>
          </template>

          <a-form ref="formRef" :model="form" :rules="formRules" :label-col="{ style: { width: '100px' } }" >
            <a-form-item label="浠诲姟鍚嶇О" prop="name">
              <a-input v-model:value="form.name" maxlength="40" placeholder="渚嬪锛氫粨鎷?绾㈢洅鎶撳彇鏀剧疆" />
            </a-form-item>
            <a-form-item label="鍦烘櫙淇℃伅" prop="scene">
              <a-select v-model:value="form.scene" placeholder="閫夋嫨鍦烘櫙" style="width: 100%">
                <a-select-option
                  v-for="s in meta.scenes"
                  :key="s.value"
                  :value="s.value">{{ s.label }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="閲囬泦鏂规" prop="plan">
              <a-select v-model:value="form.plan" placeholder="閫夋嫨鏂规" style="width: 100%">
                <a-select-option
                  v-for="p in meta.plans"
                  :key="p.value"
                  :value="p.value">{{ p.label }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="閲囬泦妯″紡" prop="mode">
              <a-radio-group v-model:value="form.mode">
                <a-radio v-for="m in meta.modes" :key="m.value" :value="m.value">
                  {{ m.label }}
                </a-radio>
              </a-radio-group>
            </a-form-item>
            <a-form-item label="鍔ㄤ綔妯℃澘" prop="actionTemplateIds">
              <a-select
                v-model:value="form.actionTemplateIds"
                multiple
                collapse-tags
                collapse-tags-tooltip
                placeholder="澶氶€夊姩浣滄ā鏉?
                style="width: 100%">
                <a-select-option
                  v-for="t in meta.actionTemplates"
                  :key="t.id"
                  :value="t.id">{{ `${t.name} (${t.code})` }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="浜哄憳閰嶇疆" prop="personnelIds">
              <a-select
                v-model:value="form.personnelIds"
                multiple
                collapse-tags
                placeholder="閫夋嫨閲囬泦/鏍囨敞浜哄憳"
                style="width: 100%">
                <a-select-option
                  v-for="u in meta.personnel"
                  :key="u.id"
                  :value="u.id">{{ `${u.name} 路 ${u.dept}` }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="浠诲姟鎸囦护">
              <a-textarea
                v-model:value="form.instruction"
                
                :rows="3"
                placeholder="鑷劧璇█浠诲姟鎸囦护锛堝皢涓庤棰?鍥惧儚鑱斿姩灞曠ず锛? />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" :loading="saving" @click="onSubmit">鍒涘缓浠诲姟</a-button>
              <a-button @click="refresh">鍒锋柊鍒楄〃</a-button>
            </a-form-item>
          </a-form>

          <ProgressMock :running="saving" label="鍐欏叆閲囬泦鏂规涓庝汉鍛橀厤缃? :duration="700" />
        </a-card>
      </a-col>

      <a-col :span="14">
        <a-card  class="card">
          <template #title>
            <div class="card-head">
              <span>閲囬泦浠诲姟鍒楄〃</span>
              <span class="orn-text" type="info" size="small">prefix ORN-VLA-</span>
            </div>
          </template>

          <a-empty v-if="!tasks.length && !loading" description="鏆傛棤閲囬泦浠诲姟锛岃鍏堝垱寤? />
<a-table v-else :data-source="tasks" :columns="ornTableCols1" :pagination="false" row-key="id" size="small">
  <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'id'">
{{ labelOf(meta.scenes, record.scene) }}
      </template>
      <template v-if="column.key === '妯″紡'">
{{ labelOf(meta.modes, record.mode) }}
      </template>
      <template v-if="column.key === 'actionCount'">
<a-tag size="small" :color="mapTagColor(record.status === 'annotating' ? 'warning' : 'info')">
                  {{ record.status }}
                </a-tag>
      </template>
      <template v-if="column.key === '鎿嶄綔'">
<a-button  type="" @click="goAnnotate(record.id)">鏍囨敞</a-button>
                <a-button  color="warning" @click="goQuality(record.id)">璐ㄦ</a-button>
      </template>
  </template>
</a-table>
    <div style="margin-top: 12px; text-align: right">
      <a-pagination v-model:current="page" v-model:page-size="pageSize" :total="total" show-size-changer @change="load" />
    </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped>
.card {
  border-radius: 8px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
:deep(.el-radio) {
  margin-right: 12px;
  margin-bottom: 6px;
}
</style>

