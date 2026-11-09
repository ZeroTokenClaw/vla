from pathlib import Path
path = Path(r'E:\omp\vla\vla-demo-element\src\services\vla.js')
text = path.read_text(encoding='utf-8')

# Add paginate import after delay import
needle = "import { businessDelay } from './delay'\n"
if "from '@/mock/seed/paginate'" not in text:
    text = text.replace(
        needle,
        needle + "import { paginate } from '@/mock/seed/paginate'\n",
    )

old_list = '''export async function listVlaTasks() {
  await businessDelay()
  return state.tasks.map((t) => ({
    id: t.id,
    name: t.name,
    scene: t.scene,
    plan: t.plan,
    mode: t.mode,
    status: t.status,
    createdAt: t.createdAt,
    actionCount: t.actions.length,
    issueCount: t.issues.length,
    issuesDetected: t.issuesDetected,
    personnelIds: [...t.personnelIds],
  }))
}'''

new_list = '''export async function listVlaTasks(query = {}) {
  await businessDelay()
  let rows = state.tasks.map((t) => ({
    id: t.id,
    name: t.name,
    scene: t.scene,
    plan: t.plan,
    mode: t.mode,
    status: t.status,
    createdAt: t.createdAt,
    actionCount: t.actions.length,
    issueCount: t.issues.length,
    issuesDetected: t.issuesDetected,
    personnelIds: [...t.personnelIds],
  }))
  if (query.scene) rows = rows.filter((t) => t.scene === query.scene)
  if (query.mode) rows = rows.filter((t) => t.mode === query.mode)
  if (query.status) rows = rows.filter((t) => t.status === query.status)
  if (query.keyword) {
    const kw = String(query.keyword).trim().toLowerCase()
    if (kw) {
      rows = rows.filter(
        (t) => t.id.toLowerCase().includes(kw) || t.name.toLowerCase().includes(kw),
      )
    }
  }
  return paginate(rows, query)
}'''

if old_list not in text:
    raise SystemExit('listVlaTasks block not found')
text = text.replace(old_list, new_list)

# Diversify media on createCollectTask + add trajectory
old_create_media = """    imageUrl: '/samples/video/bin_pick_poster.jpg',
    videoUrl: '/samples/video/bin_pick.mp4',
    fps: 10,
    totalFrames: 100,
    durationSec: 10,
    status: 'ready',
    createdAt: now(),
    actions: [],
    issuesSeed: [],
    issues: [],
    issuesDetected: false,
    filteredOut: [],
    templateSnapshot: templates.map((t) => ({ ...t })),
  }"""

# Avoid backticks in this patch script — use string concat for template-ish parts
new_create_media = """    imageUrl: '/samples/video/ep_0' + String(((state.seq - 1) % 6) + 1).padStart(1, '0') + '_poster.jpg',
    videoUrl: '/samples/video/ep_0' + String(((state.seq - 1) % 6) + 1).padStart(1, '0') + '.mp4',
    fps: 10,
    totalFrames: 100,
    durationSec: 10,
    status: 'ready',
    createdAt: now(),
    actions: [],
    issuesSeed: [],
    issues: [],
    issuesDetected: false,
    filteredOut: [],
    trajectory: {
      joints: Array.from({ length: 12 }, (_, i) =>
        Array.from({ length: 7 }, (__, j) => Number((0.1 * i + 0.01 * j).toFixed(4))),
      ),
      gripper: Array.from({ length: 12 }, (_, i) => Number((i / 12).toFixed(3))),
      tSec: Array.from({ length: 12 }, (_, i) => Number((i / 10).toFixed(2))),
      hz: 10,
    },
    templateSnapshot: templates.map((t) => ({ ...t })),
  }"""

# Fix padStart - ep_01 needs 2 digit after ep_0. Better:
# ep_0${((state.seq-1)%6)+1} only works for 1-6 as single digit with ep_0 prefix → ep_01..ep_06 if we use padStart(2)
new_create_media = """    imageUrl: mediaUrls.imageUrl,
    videoUrl: mediaUrls.videoUrl,
    fps: 10,
    totalFrames: 100,
    durationSec: 10,
    status: 'ready',
    createdAt: now(),
    actions: [],
    issuesSeed: [],
    issues: [],
    issuesDetected: false,
    filteredOut: [],
    trajectory: {
      joints: Array.from({ length: 12 }, (_, i) =>
        Array.from({ length: 7 }, (__, j) => Number((0.1 * i + 0.01 * j).toFixed(4))),
      ),
      gripper: Array.from({ length: 12 }, (_, i) => Number((i / 12).toFixed(3))),
      tSec: Array.from({ length: 12 }, (_, i) => Number((i / 10).toFixed(2))),
      hz: 10,
    },
    templateSnapshot: templates.map((t) => ({ ...t })),
  }"""

if old_create_media not in text:
    raise SystemExit('createCollectTask media block not found')
text = text.replace(old_create_media, new_create_media)

# Insert mediaUrls computation before const task
old_task_start = "  const id = nextVlaId(state.seq++)\n  const templates = ACTION_TEMPLATES.filter((a) => config.actionTemplateIds.includes(a.id))\n  const task = {"
new_task_start = """  const id = nextVlaId(state.seq++)
  const templates = ACTION_TEMPLATES.filter((a) => config.actionTemplateIds.includes(a.id))
  const epN = String(((state.seq - 2) % 6) + 1).padStart(2, '0')
  const mediaUrls = {
    videoUrl: '/samples/video/ep_' + epN + '.mp4',
    imageUrl: '/samples/video/ep_' + epN + '_poster.jpg',
  }
  const task = {"""
if old_task_start not in text:
    raise SystemExit('createCollectTask task start not found')
text = text.replace(old_task_start, new_task_start)

path.write_text(text, encoding='utf-8', newline='\n')
print('services/vla.js patched')
# sanity
t2 = path.read_text(encoding='utf-8')
assert 'paginate(rows, query)' in t2
assert 'if (query.scene)' in t2
assert 'trajectory:' in t2
print('asserts ok')
