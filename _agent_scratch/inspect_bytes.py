from pathlib import Path
t = Path(r'E:\omp\vla\vla-demo-element\src\views\qc\QcTaskList.vue').read_bytes()
# find label= near modality
idx = t.find(b'filters.modality')
print('idx', idx)
print(t[idx-80:idx+40])
print('---')
# check if file has BOM or wrong encoding
print('BOM', t[:3])
# find all el-form-item label=
import re
text = t.decode('utf-8')
for m in re.finditer(r'<el-form-item label="([^"]*)"', text):
    print(repr(m.group(1)), m.group(1).encode('unicode_escape'))
