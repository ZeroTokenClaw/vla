from pathlib import Path
path = Path(r'E:\omp\vla\vla-demo-element\src\views\vla\CollectConfig.vue')
text = path.read_text(encoding='utf-8')
print('has page ref', 'const page = ref(1)' in text)
print('has onSearch', 'async function onSearch' in text)
print('has list-filters', 'list-filters' in text)
print('has pager', 'v-model:current-page="page"' in text)
# show around 任务列表
idx = text.find('采集任务列表')
print('idx', idx)
print(repr(text[idx:idx+500]))
