from pathlib import Path
seed = Path(r'E:\omp\vla\vla-demo-element\src\mock\seed\vla.js').read_text(encoding='utf-8')
assert '/samples/video/ep_0' in seed
assert 'trajectory' in seed
assert 'kitchen_counter' in seed
mock = Path(r'E:\omp\vla\vla-demo-element\src\mock\vla.js').read_text(encoding='utf-8')
assert 'DL-VLA-2026-001' in mock
assert 'seedVlaEpisodes' in mock
assert '仓拣-红盒抓取放置' in mock
svc = Path(r'E:\omp\vla\vla-demo-element\src\services\vla.js').read_text(encoding='utf-8')
assert 'paginate(rows, query)' in svc
assert 'query.scene' in svc
print('file sanity OK')
