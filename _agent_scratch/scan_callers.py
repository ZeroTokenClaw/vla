from pathlib import Path
root = Path(r'E:\omp\vla\vla-demo-element\src')
for f in root.rglob('*'):
    if f.suffix not in {'.js', '.vue', '.ts'}:
        continue
    t = f.read_text(encoding='utf-8')
    hits = []
    for i,l in enumerate(t.splitlines(),1):
        if 'listQcTasks' in l or 'listSamplePool' in l:
            hits.append(f'{i}:{l.strip()}')
    if hits:
        print('===', f.relative_to(root))
        print('\n'.join(hits))

# quick runtime check
import subprocess, json
