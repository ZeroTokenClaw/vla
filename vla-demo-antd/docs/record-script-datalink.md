# Orion Annotate · 录屏操作脚本

> 环境：http://127.0.0.1:5102　数据：本地 mock + `public/samples` 脱敏样例  
> 建议分辨率 1920×1080；顶栏横向 Menu + Product Tour；角色为 Annotator / Reviewer / Admin。  
> ID 前缀一律 `ORN-`；口播时强调 **severity / workspace / telem / catalog / ckptList**。

---

## 片头（15s）

1. 打开 http://127.0.0.1:5102 ，展示 Product Tour 与 Dataset 卡片。  
2. 顶栏横向 Menu：QC / Pre-label / VLA / Training。  
3. 切换身份为 **Admin**（后续训练与分配需要）。

---

## 一、多模态 QC（约 4–6 min）

1. Jobs 列表：打开文本 / 图像 / 语音 / 视频 / 点云各一单，保存标注并看 notification。  
2. Workflow board：创建→分配→标注→初审→终审；Reviewer 驳回 + Admin 终审。  
3. Spec + Sample check：规则、随机抽检、通过/驳回回流。

---

## 二、自动化预标注（约 3–4 min）

1. Text prelabel：选 `ORN-TXT-2026-001`，修 ADDRESS→ORG 的故意 Diff。  
2. Vision OCR + YOLO → 人工改框。  
3. Acceptance wizard：Confirm → Annotate → QC → Accept。

---

## 三、VLA 采集（约 5–7 min）

1. Collect config：空提交校验 → 填齐场景（aisle_pick 等）后创建。  
2. Timeline：播放非单一共用视频；导出 JSON / Excel / CSV。  
3. Sample QC：抖动/遮挡/模糊/缺失/不匹配 → 过滤。

---

## 四、训练（约 3–4 min）

1. Algo config：算法/版本/GPU → 创建实验。  
2. Run + Metrics：Start/Stop；loss/acc/mAP；导出报表。

---

## 片尾（10s）

回到首页扫一眼 Activity；口播覆盖评分点且为 Orion 独立字段体系。

## 录制注意

- 语音/视频务必点播放；导出露出文件名。  
- 驳回、校验失败、权限拒绝各至少出镜一次。

## 厚数据加录（分页 / 筛选 / 详情）

1. 打开 QC Jobs 列表：总数 ≥50；按 status、modality、**severity=P0**、**workspace** 筛选；翻到第 2 页再回第 1 页。
2. 打开含驳回链的 Job，读出 severity 与驳回原因。
3. 预标注文本列表翻页；点开 `ORN-TXT-2026-001`，演示故意 Diff 修正。
4. VLA Collect 列表翻页；打开新 episode，播放 `ep_0N.mp4`（非全员同一条）；展开轨迹 **`telem.qpos` / `grip` / `tsMs`**。
5. 训练实验列表筛 status=finished；打开 `ORN-EXP-2026-001`，展示 **`catalog.fold` / `rev`**、**`ckptList`**、**`evalGrid`**、**`cmMatrix`**，滚动长 **`runLog`**。