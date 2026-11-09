from pathlib import Path

def patch_list_call(path_str):
    path = Path(path_str)
    text = path.read_text(encoding='utf-8')
    old = 'taskList.value = await listVlaTasks()'
    new = """const listRes = await listVlaTasks({ page: 1, pageSize: 200 })
  taskList.value = listRes.items"""
    if old not in text:
        raise SystemExit(f'list call missing in {path_str}')
    text = text.replace(old, new)
    path.write_text(text, encoding='utf-8', newline='\n')
    print('patched', path_str)

patch_list_call(r'E:\omp\vla\vla-demo-element\src\views\vla\TimelineAnnotate.vue')
patch_list_call(r'E:\omp\vla\vla-demo-element\src\views\vla\QualityGate.vue')

path = Path(r'E:\omp\vla\vla-demo-element\src\views\vla\TimelineAnnotate.vue')
text = path.read_text(encoding='utf-8')
if 'trajectoryPreview' not in text:
    needle = 'const currentActionHint = computed(() => {'
    idx = text.find(needle)
    if idx < 0:
        raise SystemExit('currentActionHint missing')
    end = text.find('})', idx)
    end = text.find('\n', end) + 1
    insert = '''
const trajectoryPreview = computed(() => {
  const tr = task.value?.trajectory
  if (!tr?.joints?.length) return null
  const last = tr.joints[Math.min(currentFrame.value, tr.joints.length - 1)] || tr.joints[0]
  return {
    frames: tr.joints.length,
    hz: tr.hz,
    dof: last?.length || 0,
    joints: last,
    gripper: tr.gripper?.[Math.min(currentFrame.value, (tr.gripper?.length || 1) - 1)],
    tSec: tr.tSec?.[Math.min(currentFrame.value, (tr.tSec?.length || 1) - 1)],
  }
})
'''
    text = text[:end] + insert + text[end:]

    bt = chr(96)
    title = bt + '轨迹 trajectory · ${trajectoryPreview.frames}帧 @${trajectoryPreview.hz}Hz · DoF ${trajectoryPreview.dof}' + bt
    desc = bt + "t=${trajectoryPreview.tSec}s gripper=${trajectoryPreview.gripper} joints=[${(trajectoryPreview.joints || []).map((x) => Number(x).toFixed(2)).join(', ')}]" + bt
    ui = f'''
        <el-alert
          v-if="trajectoryPreview"
          type="info"
          :closable="false"
          show-icon
          class="traj-alert"
          :title="{title}"
          :description="{desc}"
        />
'''
    sidx = text.find('<el-slider')
    if sidx > 0:
        text = text[:sidx] + ui + text[sidx:]
    if '.traj-alert' not in text:
        text = text.replace('</style>', '.traj-alert {\n  margin-bottom: 10px;\n}\n</style>')
    path.write_text(text, encoding='utf-8', newline='\n')

check = path.read_text(encoding='utf-8')
assert 'trajectoryPreview' in check
assert 'listRes.items' in check
assert 'listRes.items' in Path(r'E:\omp\vla\vla-demo-element\src\views\vla\QualityGate.vue').read_text(encoding='utf-8')
print('TimelineAnnotate OK')
