from pathlib import Path
t = Path(r'E:\omp\vla\vla-demo-element\src\views\qc\QcTaskList.vue').read_text(encoding='utf-8')
# show script filters and template filter section
print('--- script snippet ---')
for i,l in enumerate(t.splitlines(),1):
    if 'filters' in l or 'async function load' in l or 'page' in l or 'total' in l:
        if i < 80:
            print(f'{i}|{l}')
print('--- template form ---')
start = t.find('<el-form')
print(t[start:start+900])
