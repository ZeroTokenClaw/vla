from pathlib import Path
t = Path(r'E:\omp\vla\vla-demo-element\src\mock\qc.js').read_text(encoding='utf-8')
pos = t.find("id: 'DL-2026-1102-0251'")
chunk = t[pos:pos+1800]
print('has rejectChain in chunk', 'rejectChain' in chunk)
idx = chunk.find('rejectReason')
print(chunk[idx:idx+250])
