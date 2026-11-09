# 《VLA 数据质量检测算法设计》

> 对应评分：6.3（2.5 分）  
> 原则：规则检测 + 视觉算法 + 多模态语义校验；必须展示真实检测结果与处理前后数据变化。

---

## 1. 检测流水线

```
输入：VLA Sample（视频帧序列 + 图像 + 文本指令 + 动作节点 + 关系）
  → 预处理（抽帧、缩放、对齐时间戳）
  → 并行检测器
      ├─ 抖动 ShakeDetector
      ├─ 遮挡 OcclusionDetector
      ├─ 模糊 BlurDetector
      ├─ 缺失 MissingDetector
      └─ 不匹配 MismatchDetector
  → 汇总 Issue[]（类型、等级、定位、证据）
  → 人工复核 / 批量过滤
  → 合格回流 / 不合格入异常池
```

---

## 2. 检测器设计

### 2.1 抖动检测（Shake）

| 项 | 内容 |
|----|------|
| 方法 | 相邻帧灰度光流 / 特征点位移幅值；或帧差能量 |
| 特征 | mean_motion、max_motion、高频抖动比 |
| 判定 | 超过阈值 → `shake`；定位起止帧 |
| 实现 | OpenCV `calcOpticalFlowPyrLK` 或 Farneback |
| 等级 | low/mid/high 按幅值分位 |

### 2.2 遮挡检测（Occlusion）

| 项 | 内容 |
|----|------|
| 方法 | 若有手/物体检测框：目标可见面积比；无检测时用中心 ROI 亮度突变 + 边缘缺失启发式 |
| 特征 | visibility_ratio、overlap_ratio |
| 判定 | 关键动作区间内可见比 < 阈值 |
| 定位 | 帧号 + bbox/ROI |

### 2.3 模糊检测（Blur）

| 项 | 内容 |
|----|------|
| 方法 | Laplacian 方差；可选 Tenengrad |
| 特征 | sharpness_score |
| 判定 | score < T_blur → blur；区分运动模糊可结合光流幅值 |
| 输出 | 每帧分数曲线，标出最低分帧 |

### 2.4 数据缺失检测（Missing）

纯规则，确定性高：

| 检查项 | 条件 |
|--------|------|
| 视频缺失 | videoUri 空或文件不存在 |
| 图像缺失 | 关键帧无对应 image |
| 文本缺失 | sceneText 空 |
| 指令缺失 | instruction 空 |
| 时间戳缺失 | action 缺 start/end ts |
| 动作节点缺失 | actions 空或关键节点空 |
| 关联缺失 | ModalityRelation 断链 |

### 2.5 样本与任务不匹配（Mismatch）

| 子类 | 方法 |
|------|------|
| 场景 vs 任务 | 场景标签与任务目标集合交集为空 |
| 动作 vs 指令 | 关键词/嵌入相似度（可先规则词典，后接小模型） |
| 视频 vs 文本 | 时长与描述步骤数严重不符；或 CLIP 图文分（可选） |
| 样本 vs 模板 | 动作类别不在模板允许集合 |

最小可验收路径：**缺失规则 + 模糊 Laplacian + 抖动光流** 三路真实计算；不匹配先规则后增强语义模型。

---

## 3. Issue 数据模型

```json
{
  "id": "ISS-...",
  "sampleId": "S-...",
  "type": "blur|shake|occlusion|missing|mismatch",
  "severity": "low|mid|high",
  "frameStart": 12,
  "frameEnd": 18,
  "message": "清晰度分数 28.4 < 阈值 50",
  "evidence": { "score": 28.4, "threshold": 50 },
  "detectorVersion": "vla-qc-0.1.0",
  "status": "open|confirmed|dismissed|filtered"
}
```

---

## 4. 不合格处理

| 动作 | 效果 |
|------|------|
| 展示结果 | 列表 + 帧预览 + 证据 |
| 标记不合格 | sample.qualified=false |
| 批量过滤 | 从训练集视图排除 |
| 人工复核 | 可 dismiss 误报 |
| 合格回流 | 写入 Dataset 版本 |

监控要求：展示检测前后合格样本数变化（before/after）。

---

## 5. 服务接口

`POST /api/v1/vla/tasks/{id}/detect`  
→ 异步任务 → `GET /api/v1/vla/tasks/{id}/issues`

工作流节点 `quality_check` 复用同一 Worker。

---

## 6. 验收要点

1. 对标准样例执行检测，返回五类中至少三类真实计算项。  
2. `detectorVersion` 与分数可见，非纯种子文案。  
3. 标记过滤后列表数量变化可验证。  
4. 日志可追溯每次检测运行。
