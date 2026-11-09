from pathlib import Path
import re

qc_path = Path(r'E:\omp\vla\vla-demo-element\src\mock\qc.js')
text = qc_path.read_text(encoding='utf-8')

# Add import after first comment line / at top after docstring
if "from './seed/qc'" not in text:
    # insert after the first line comment block ends - actually after line 1
    text = "import { seedQcTasks, seedSamplePool } from './seed/qc'\n\n" + text

# Add buCode / rejectChain to each hand task object.
# Strategy: after each priority line inside createInitialTasks, ensure buCode exists;
# and after rejectReason lines add rejectChain if missing.

# Simpler: wrap createInitialTasks body

old_fn_start = text.find('export function createInitialTasks()')
old_fn_end = text.find('export const SAMPLE_RULES')
if old_fn_start < 0 or old_fn_end < 0:
    raise SystemExit('could not find createInitialTasks bounds')

# Extract the array literal from return [ ... ]
fn_body = text[old_fn_start:old_fn_end]
# We'll rebuild createInitialTasks by patching the return array items

# Patch hand rows: inject buCode after priority lines that lack following buCode
def inject_fields(src: str) -> str:
    lines = src.splitlines(keepends=True)
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        out.append(line)
        # after priority: 'xxx',
        if re.search(r"priority:\s*'(high|medium|low)',\s*$", line) and i + 1 < len(lines):
            nxt = lines[i + 1]
            if 'buCode' not in nxt:
                # infer bu from modality later — use rotating defaults based on id nearby
                out.append("      buCode: 'BU-华东',\n")
        # after rejectReason line, ensure rejectChain
        if re.search(r"rejectReason:\s*(null|'[^']+'),\s*$", line) and i + 1 < len(lines):
            nxt = lines[i + 1]
            if 'rejectChain' not in nxt and 'rejectChain' not in line:
                # look back for status rejected in previous lines of this object
                window = ''.join(out[-40:])
                if "status: 'rejected'" in window:
                    out.append("      rejectChain: [{ at: '2026-11-04 09:45:00', by: 'u-dl-reviewer', reason: 'label_miss' }],\n")
                else:
                    out.append("      rejectChain: [],\n")
        i += 1
    return ''.join(out)

patched = inject_fields(text)

# Now replace createInitialTasks to wrap with seed
# Find return [ ... ] of createInitialTasks and change structure

pat = re.compile(
    r"export function createInitialTasks\(\) \{\n  return \[",
    re.M,
)
m = pat.search(patched)
if not m:
    raise SystemExit('createInitialTasks return not found')

# Replace ending of createInitialTasks: `  ]\n}\n\nexport const SAMPLE_RULES`
end_pat = re.compile(r"\n  \]\n\}\n\nexport const SAMPLE_RULES", re.M)
em = end_pat.search(patched)
if not em:
    raise SystemExit('end of createInitialTasks not found')

# Change start
patched = patched[:m.start()] + "export function createInitialTasks() {\n  const hand = [" + patched[m.end():]

# After inject, re-find end because offsets changed
em = end_pat.search(patched)
if not em:
    raise SystemExit('end of createInitialTasks not found after start rewrite')

replacement_end = """
  ]
  // ensure hand rows have buCode / rejectChain (defense in depth)
  for (const t of hand) {
    if (!t.buCode) t.buCode = 'BU-华东'
    if (!Array.isArray(t.rejectChain)) t.rejectChain = []
  }
  try {
    return seedQcTasks(hand)
  } catch (e) {
    console.error('[datalink] QC seed failed, fallback thin', e)
    return hand
  }
}

export const SAMPLE_RULES"""

patched = patched[:em.start()] + replacement_end + patched[em.end():]

# Patch createInitialSamplePool similarly
sp_start = patched.find('export function createInitialSamplePool()')
if sp_start < 0:
    raise SystemExit('sample pool fn missing')
# replace entire function
sp_end = len(patched)
# function goes to end of file typically
# find last closing of the function - file ends with the return array
old_sp = patched[sp_start:]
# keep hand array, wrap with seed
old_sp2 = old_sp.replace(
    'export function createInitialSamplePool() {\n  return [',
    'export function createInitialSamplePool(tasks = []) {\n  const hand = [',
    1,
)
# change closing `  ]\n}\n` at end
if not old_sp2.rstrip().endswith('}'):
    raise SystemExit('unexpected sample pool ending')
# replace final `  ]\n}` 
idx = old_sp2.rstrip().rfind(']')
# find the closing of return array
m2 = re.search(r'\n  \]\n\}\s*$', old_sp2)
if not m2:
    raise SystemExit('sample pool end pattern missing')
old_sp3 = old_sp2[:m2.start()] + """
  ]
  try {
    return seedSamplePool(hand, tasks)
  } catch (e) {
    console.error('[datalink] sample pool seed failed, fallback thin', e)
    return hand
  }
}
"""
patched = patched[:sp_start] + old_sp3

qc_path.write_text(patched, encoding='utf-8')
print('mock/qc.js patched, bytes', qc_path.stat().st_size)

# Diversify buCode on hand rows by id for better demo variety
text2 = qc_path.read_text(encoding='utf-8')
# Map specific showcase ids to buCodes
replacements = [
    ("id: 'DL-2026-1104-0312'", "BU-华东"),
    ("id: 'DL-2026-1104-0318'", "BU-华南"),
    ("id: 'DL-2026-1103-0288'", "BU-华北"),
    ("id: 'DL-2026-1102-0251'", "BU-西南"),
    ("id: 'DL-2026-1104-0330'", "BU-华东"),
    ("id: 'DL-2026-1101-0204'", "BU-华南"),
]
# For each id, find nearby buCode: 'BU-华东' that we injected and replace first occurrence after id
for id_snip, bu in replacements:
    pos = text2.find(id_snip)
    if pos < 0:
        print('WARN missing', id_snip)
        continue
    # find next buCode within 800 chars
    window = text2[pos:pos+800]
    mbu = re.search(r"buCode: 'BU-[^']+'", window)
    if mbu:
        abs_start = pos + mbu.start()
        abs_end = pos + mbu.end()
        text2 = text2[:abs_start] + f"buCode: '{bu}'" + text2[abs_end:]
        print('set', id_snip, '->', bu)
    else:
        print('WARN no buCode near', id_snip)

qc_path.write_text(text2, encoding='utf-8')
print('buCode diversified')
