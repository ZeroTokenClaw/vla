BT = chr(96)
# Rebuild mock/vla.js from HAND seeds + seed import. Read Chinese from the corrupted file carefully —
# better: reconstruct with unicode escapes for Chinese labels.

def q(s):
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"

modes = [
    ('teleop', '遥操作采集'),
    ('scripted', '脚本化采集'),
    ('human_demo', '真人示范'),
    ('mixed', '混合模式'),
]
scenes = [
    ('kitchen_counter', '厨房台面'),
    ('lab_bench', '实验台'),
    ('warehouse_bin', '仓拣料箱'),
    ('office_desk', '办公桌面'),
]
plans = [
    ('pick_place_std', '标准抓取放置方案'),
    ('open_drawer', '开抽屉序列方案'),
    ('wipe_surface', '擦拭表面方案'),
    ('sort_parts', '零件分拣方案'),
]
templates = [
    ('tpl-reach', '伸手接近', 'REACH'),
    ('tpl-grasp', '闭合抓取', 'GRASP'),
    ('tpl-lift', '抬升', 'LIFT'),
    ('tpl-move', '平移运送', 'MOVE'),
    ('tpl-place', '放置释放', 'PLACE'),
    ('tpl-retreat', '回撤复位', 'RETREAT'),
    ('tpl-open', '开合机构', 'OPEN'),
    ('tpl-wipe', '擦拭', 'WIPE'),
]
issues = [
    ('jitter', '样本抖动', 'warning'),
    ('occlusion', '遮挡', 'danger'),
    ('blur', '模糊', 'warning'),
    ('missing', '数据缺失', 'info'),
    ('mismatch', '样本与任务不匹配', 'danger'),
]

out = []
A = out.append
A("import { seedVlaEpisodes } from './seed/vla'")
A("")
A("/** DataLink 具身采集标注 mock：采集任务、动作模板、时间轴片段、质检问题单 */")
A("")
A("export const COLLECT_MODES = [")
for v,l in modes:
    A(f"  {{ value: '{v}', label: '{l}' }},")
A("]")
A("")
A("export const SCENE_OPTIONS = [")
for v,l in scenes:
    A(f"  {{ value: '{v}', label: '{l}' }},")
A("]")
A("")
A("export const PLAN_OPTIONS = [")
for v,l in plans:
    A(f"  {{ value: '{v}', label: '{l}' }},")
A("]")
A("")
A("export const ACTION_TEMPLATES = [")
for i,n,c in templates:
    A(f"  {{ id: '{i}', name: '{n}', code: '{c}' }},")
A("]")
A("")
A("export const ISSUE_TYPES = [")
for k,l,c in issues:
    A(f"  {{ key: '{k}', label: '{l}', color: '{c}' }},")
A("]")
A("")
A("/** Hand-written showcase episodes (tests + demo paths hard-code IDs). */")
A("const HAND_VLA_TASKS = [")

# Task 001
A("  {")
A("    id: 'DL-VLA-2026-001',")
A("    name: '仓拣-红盒抓取放置',")
A("    scene: 'warehouse_bin',")
A("    plan: 'pick_place_std',")
A("    mode: 'teleop',")
A("    actionTemplateIds: ['tpl-reach', 'tpl-grasp', 'tpl-lift', 'tpl-move', 'tpl-place', 'tpl-retreat'],")
A("    personnelIds: ['u-dl-annotator', 'u-dl-annotator-2'],")
A("    instruction: '请将料箱中的红色零件盒抓起，平稳放置到传送带左侧托盘，避开蓝色障碍物。',")
A("    imageUrl: '/samples/video/bin_pick_poster.jpg',")
A("    videoUrl: '/samples/video/bin_pick.mp4',")
A("    fps: 10,")
A("    totalFrames: 120,")
A("    durationSec: 12,")
A("    status: 'annotating',")
A("    createdAt: '2026-11-03 10:18:00',")
A("    actions: [")
actions1 = [
    ('act-1',5,22,'REACH','伸手接近','末端接近红色零件盒上方',True),
    ('act-2',23,38,'GRASP','闭合抓取','夹爪闭合抓稳红盒',True),
    ('act-3',39,55,'LIFT','抬升','抬升至安全高度',False),
    ('act-4',56,85,'MOVE','平移运送','平移至托盘上方，避开蓝障',True),
    ('act-5',86,102,'PLACE','放置释放','放置到托盘左侧并松开',True),
    ('act-6',103,118,'RETREAT','回撤复位','回撤到初始姿态',False),
]
for i,(aid,sf,ef,ac,al,ins,kn) in enumerate(actions1):
    comma = ',' if i < len(actions1)-1 else ''
    A("      {")
    A(f"        id: '{aid}',")
    A(f"        startFrame: {sf},")
    A(f"        endFrame: {ef},")
    A(f"        action: '{ac}',")
    A(f"        actionLabel: '{al}',")
    A(f"        instruction: '{ins}',")
    A(f"        keyNode: {'true' if kn else 'false'},")
    A("      }" + (',' if i < len(actions1)-1 else ''))
A("    ],")
A("    issuesSeed: [")
issues1 = [
    ('iss-1','jitter',48,'medium','抬升阶段末端抖动超阈值（帧 48±3）','SMP-001-A'),
    ('iss-2','occlusion',72,'high','蓝障短暂遮挡红盒超过 40% 面积','SMP-001-B'),
    ('iss-3','blur',91,'low','放置瞬间运动模糊，关键帧清晰度不足','SMP-001-C'),
    ('iss-4','missing',110,'medium','回撤段缺失关节力矩通道 0.4s','SMP-001-D'),
    ('iss-5','mismatch',0,'high','任务指令要求「托盘左侧」，轨迹终点偏右','SMP-001-E'),
]
for i,(iid,ty,fr,sev,msg,sid) in enumerate(issues1):
    A("      {")
    A(f"        id: '{iid}',")
    A(f"        type: '{ty}',")
    A(f"        frame: {fr},")
    A(f"        severity: '{sev}',")
    A(f"        message: '{msg}',")
    A(f"        sampleId: '{sid}',")
    A("      }" + (',' if i < len(issues1)-1 else ''))
A("    ],")
A("  },")

# Task 002
A("  {")
A("    id: 'DL-VLA-2026-002',")
A("    name: '厨房-开抽屉取杯',")
A("    scene: 'kitchen_counter',")
A("    plan: 'open_drawer',")
A("    mode: 'human_demo',")
A("    actionTemplateIds: ['tpl-reach', 'tpl-open', 'tpl-grasp', 'tpl-retreat'],")
A("    personnelIds: ['u-dl-annotator'],")
A("    instruction: '打开中层抽屉，取出白色马克杯，放到台面中央。',")
A("    imageUrl: '/samples/video/bin_pick_poster.jpg',")
A("    videoUrl: '/samples/video/bin_pick.mp4',")
A("    fps: 10,")
A("    totalFrames: 90,")
A("    durationSec: 9,")
A("    status: 'ready',")
A("    createdAt: '2026-11-03 14:02:00',")
A("    actions: [")
actions2 = [
    ('act-a',3,20,'REACH','伸手接近','接近抽屉把手',True),
    ('act-b',21,45,'OPEN','开合机构','拉开中层抽屉至限位',True),
    ('act-c',46,70,'GRASP','闭合抓取','抓取白色马克杯',True),
    ('act-d',71,88,'RETREAT','回撤复位','放到台面中央后回撤',False),
]
for i,(aid,sf,ef,ac,al,ins,kn) in enumerate(actions2):
    A("      {")
    A(f"        id: '{aid}',")
    A(f"        startFrame: {sf},")
    A(f"        endFrame: {ef},")
    A(f"        action: '{ac}',")
    A(f"        actionLabel: '{al}',")
    A(f"        instruction: '{ins}',")
    A(f"        keyNode: {'true' if kn else 'false'},")
    A("      }" + (',' if i < len(actions2)-1 else ''))
A("    ],")
A("    issuesSeed: [")
issues2 = [
    ('iss-6','blur',33,'medium','拉抽屉过程相机对焦失败','SMP-002-A'),
    ('iss-7','missing',60,'high','抓取段缺失腕部 RGB 约 8 帧','SMP-002-B'),
    ('iss-8','mismatch',0,'medium','方案为开抽屉，日志标注含擦拭动作模板','SMP-002-C'),
]
for i,(iid,ty,fr,sev,msg,sid) in enumerate(issues2):
    A("      {")
    A(f"        id: '{iid}',")
    A(f"        type: '{ty}',")
    A(f"        frame: {fr},")
    A(f"        severity: '{sev}',")
    A(f"        message: '{msg}',")
    A(f"        sampleId: '{sid}',")
    A("      }" + (',' if i < len(issues2)-1 else ''))
A("    ],")
A("  },")

# Task 003
A("  {")
A("    id: 'DL-VLA-2026-003',")
A("    name: '实验台-擦拭表面（待标注）',")
A("    scene: 'lab_bench',")
A("    plan: 'wipe_surface',")
A("    mode: 'scripted',")
A("    actionTemplateIds: ['tpl-reach', 'tpl-wipe', 'tpl-retreat'],")
A("    personnelIds: ['u-dl-annotator-2', 'u-dl-reviewer'],")
A("    instruction: '持海绵沿台面从左到右擦拭两遍，避开烧杯区域。',")
A("    imageUrl: '/samples/video/bin_pick_poster.jpg',")
A("    videoUrl: '/samples/video/bin_pick.mp4',")
A("    fps: 10,")
A("    totalFrames: 100,")
A("    durationSec: 10,")
A("    status: 'ready',")
A("    createdAt: '2026-11-04 09:30:00',")
A("    actions: [],")
A("    issuesSeed: [")
issues3 = [
    ('iss-9','jitter',40,'low','擦拭往返路径存在高频微振','SMP-003-A'),
    ('iss-10','occlusion',55,'medium','操作员手臂遮挡海绵接触点','SMP-003-B'),
]
for i,(iid,ty,fr,sev,msg,sid) in enumerate(issues3):
    A("      {")
    A(f"        id: '{iid}',")
    A(f"        type: '{ty}',")
    A(f"        frame: {fr},")
    A(f"        severity: '{sev}',")
    A(f"        message: '{msg}',")
    A(f"        sampleId: '{sid}',")
    A("      }" + (',' if i < len(issues3)-1 else ''))
A("    ],")
A("  },")
A("]")
A("")
A("function loadVlaTasks() {")
A("  try {")
A("    return seedVlaEpisodes(HAND_VLA_TASKS)")
A("  } catch (err) {")
A("    console.error('[vla seed] failed, falling back to hand seeds', err)")
A("    return HAND_VLA_TASKS")
A("  }")
A("}")
A("")
A("/** Seed collect tasks with linked multimodal assets + action spans (+ thick seed). */")
A("export const VLA_TASKS = loadVlaTasks()")
A("")
A("export function nextVlaId(seq) {")
A("  const n = String(seq).padStart(3, '0')")
A("  return " + BT + "DL-VLA-2026-${n}" + BT)
A("}")
A("")

path = r'E:\omp\vla\vla-demo-element\src\mock\vla.js'
open(path, 'w', encoding='utf-8', newline='\n').write('\n'.join(out) + '\n')
print('wrote', path, 'lines', len(out))
# verify nextVlaId and a Chinese label
text = open(path, encoding='utf-8').read()
assert 'return `DL-VLA-2026-${n}`' in text
assert '仓拣-红盒抓取放置' in text
assert "seedVlaEpisodes" in text
print('asserts ok')
