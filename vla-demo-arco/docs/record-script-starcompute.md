# 星算训练台录屏脚本

1. 打开 http://127.0.0.1:5104 ，展示算力仪表盘（KPI、算力池、最近实验）。
2. 点模块卡片进入质控实验 → 走五模态标注、协作、抽检回流。
3. 预标流水线：文本 → 视觉 → 验收向导。
4. 采集实验：配置 → 时间轴标注 → 导出三格式 → 样本质检。
5. 训练实验：算法配置分配 GPU → 训练运行 → 指标面板导出报表。
6. 顶栏展示全局任务进度与角色切换；注意 ID 均为 `SC-` 前缀。

## 厚数据加录（分页 / 筛选 / 详情）

口播字段：**slaClass / tenantCode / stream / repos / weights**。

1. 打开质控实验列表：总数 ≥50；筛选状态、模态、**slaClass=S**、**tenantCode**；翻到第 2 页再回第 1 页。
2. 打开含驳回链的实验单，读出 slaClass 与驳回原因；顶栏看全局任务进度。
3. 预标流水线文本列表翻页；点开 `SC-TXT-2026-001`，演示 ADDRESS→ORG 的故意 Diff。
4. 采集实验列表翻页；打开新 episode，播放 `ep_0N.mp4`（非全员同一条）；展开轨迹 **`stream.joints` / `eeOpen` / `stamp`**。
5. 训练实验列表筛 status=finished；打开 `SC-EXP-2026-001`，展示 **`repos.partition` / `pin`**、**`weights`**、**`evalSheet`**、**`errorGrid`**，滚动长 **`trainLog`**。
