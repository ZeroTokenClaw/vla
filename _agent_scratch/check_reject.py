from pathlib import Path
t = Path(r'E:\omp\vla\vla-demo-element\src\mock\qc.js').read_text(encoding='utf-8')
pos = t.find("id: 'DL-2026-1102-0251'")
print(t[pos:pos+900])
print('rejectChain count', t.count('rejectChain'))
