# 《VLA 数据结构规范》

> 版本：EIDE-VLA-1.0  
> 用途：采集任务、多模态联动、动作标注、导出、一致性分析统一 schema。

---

## 1. 核心标识

| 字段 | 说明 |
|------|------|
| `sample_id` | 样本全局 ID，如 `EV-SAMP-0001` |
| `task_id` | 采集任务 ID，如 `EV-TASK-0001` |
| `timestamp` | 秒（float）相对视频起点 |
| `frame_idx` | 从 0 起的帧号 |
| `fps` | 采样帧率 |

关联原则：**同一事件**用相同 `sample_id` + `timestamp`/`frame_idx` 对齐视频帧、图像、指令与动作节点。

---

## 2. Episode 根对象（JSON 导出）

```json
{
  "schema": "EIDE-VLA-1.0",
  "task_id": "EV-TASK-0001",
  "sample_id": "EV-SAMP-0001",
  "scene": { "id": "SCN-01", "name": "桌面抓取" },
  "plan": { "id": "PLAN-01", "name": "双臂协同抓放" },
  "mode": "teleop",
  "robot_model": "Unitree-G1",
  "instruction": "请把红色方块放到蓝色盒子里",
  "instruction_lang": "zh-CN",
  "video": { "path": "videos/ep_01.mp4", "fps": 30, "duration_sec": 12.4 },
  "images": [{ "path": "images/frame_000120.jpg", "frame_idx": 120, "timestamp": 4.0 }],
  "text_notes": "操作员备注：光照正常",
  "actions": [],
  "key_nodes": [],
  "modality_links": [],
  "quality": { "passed": true, "issues": [] },
  "consistency": { "score": 0.92, "method": "rule_v1" },
  "exported_at": "2026-11-09T09:00:00+08:00",
  "exporter": "EIDE"
}
```

---

## 3. 动作序列 `actions[]`

```json
{
  "order_no": 1,
  "action_type": "grasp",
  "desc": "抓取红色方块",
  "start_frame": 30,
  "end_frame": 90,
  "start_ts": 1.0,
  "end_ts": 3.0,
  "template_id": "TPL-GRASP",
  "attrs": { "object": "red_cube", "hand": "right" }
}
```

约束：`end_frame >= start_frame`；同 sample 内 `order_no` 唯一且递增。

---

## 4. 关键节点 `key_nodes[]`

```json
{
  "name": "接触物体",
  "type": "contact",
  "frame_idx": 75,
  "timestamp": 2.5,
  "image_ref": "images/frame_000075.jpg",
  "labels": ["contact", "stable_grasp"]
}
```

---

## 5. 模态关联 `modality_links[]`

```json
{
  "sample_id": "EV-SAMP-0001",
  "timestamp": 2.5,
  "frame_idx": 75,
  "video_ref": "videos/ep_01.mp4",
  "image_ref": "images/frame_000075.jpg",
  "text_ref": "text_notes",
  "instruction_ref": "instruction",
  "action_order_no": 1,
  "node_name": "接触物体"
}
```

---

## 6. Excel / CSV 导出列

| 列名 | 说明 |
|------|------|
| task_id | 任务 |
| sample_id | 样本 |
| instruction | 指令 |
| action_order | 动作序 |
| action_type | 类型 |
| action_desc | 描述 |
| start_frame / end_frame | 起止帧 |
| start_ts / end_ts | 起止时间 |
| key_node | 关键节点名（可空） |
| quality_pass | 是否合格 |
| issue_types | 问题类型（分号分隔） |
| consistency_score | 一致性分 |

JSON 为完整结构；Excel/CSV 为动作级扁平表（一行一个动作）。

---

## 7. 质量与一致性嵌入

`quality.issues[]`：

```json
{ "issue_type": "blur", "severity": "medium", "start_frame": 100, "end_frame": 130, "message": "运动模糊" }
```

`issue_type` 枚举：`shake` | `occlusion` | `blur` | `missing` | `mismatch`。

---

## 8. 校验规则

1. 必需字段：`schema, task_id, sample_id, instruction, video, actions`  
2. 帧范围不超过 `duration_sec * fps`  
3. 导出前运行 schema validator；失败禁止标「导出成功」  
