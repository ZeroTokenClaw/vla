from pathlib import Path

# Fix Timeline alert title to ASCII-safe separators
path = Path(r'E:\omp\vla\vla-demo-element\src\views\vla\TimelineAnnotate.vue')
text = path.read_text(encoding='utf-8')
bt = chr(96)
# Replace any corrupted title line by matching :title=
import re
new_title = bt + 'trajectory ${trajectoryPreview.frames}f @${trajectoryPreview.hz}Hz DoF ${trajectoryPreview.dof}' + bt
text2, n = re.subn(r':title="`[^`]*`"', ':title="' + new_title + '"', text, count=1)
if n != 1:
    raise SystemExit(f'title replace count={n}')
path.write_text(text2, encoding='utf-8', newline='\n')
print('title fixed')

# Strengthen list spec with scene filter
spec = Path(r'E:\omp\vla\vla-demo-element\src\services\vla.list.spec.js')
s = spec.read_text(encoding='utf-8')
if "filters by scene" in s and "query.scene" not in s and "scene: 'warehouse_bin'" not in s:
    old = """  it('pages and filters by scene', async () => {
    const { listVlaTasks, getVlaTask } = await import('@/services/vla')
    const res = await listVlaTasks({ page: 1, pageSize: 10 })
    expect(res.total).toBeGreaterThanOrEqual(50)
    expect(res.items).toHaveLength(10)
    const one = await getVlaTask('DL-VLA-2026-001')
    expect(one.trajectory.joints[0].length).toBeGreaterThanOrEqual(6)
    expect(one.trajectory.gripper.length).toBe(one.trajectory.tSec.length)
  })"""
    new = """  it('pages and filters by scene', async () => {
    const { listVlaTasks, getVlaTask } = await import('@/services/vla')
    const res = await listVlaTasks({ page: 1, pageSize: 10 })
    expect(res.total).toBeGreaterThanOrEqual(50)
    expect(res.items).toHaveLength(10)
    const filtered = await listVlaTasks({ page: 1, pageSize: 50, scene: 'warehouse_bin' })
    expect(filtered.total).toBeGreaterThanOrEqual(1)
    expect(filtered.items.every((t) => t.scene === 'warehouse_bin')).toBe(true)
    const one = await getVlaTask('DL-VLA-2026-001')
    expect(one.trajectory.joints[0].length).toBeGreaterThanOrEqual(6)
    expect(one.trajectory.gripper.length).toBe(one.trajectory.tSec.length)
    expect(one.trajectory).toEqual(
      expect.objectContaining({
        joints: expect.any(Array),
        gripper: expect.any(Array),
        tSec: expect.any(Array),
      }),
    )
  })"""
    if old not in s:
        raise SystemExit('spec block missing')
    spec.write_text(s.replace(old, new), encoding='utf-8', newline='\n')
    print('spec strengthened')
else:
    print('spec already has scene filter or unexpected')
