# DataLink 样例素材说明

本目录为**合成脱敏**演示素材（ffmpeg lavfi 纯色/正弦波），仅供录屏与联调，禁止外传真实业务数据。

## 新增多套媒体（Task 6）

| 路径 | 说明 | 时长对齐 |
|------|------|----------|
| `images/scene_01.jpg` … `scene_06.jpg` | 脱敏场景静帧（640×360） | — |
| `video/ep_01.mp4` … `ep_06.mp4` | VLA episode 短视频（互异哈希） | 2 / 3 / 4 / 2 / 3 / 4 秒 |
| `video/ep_0N_poster.jpg` | 对应封面 | — |
| `audio/clip_01.wav` … `clip_03.wav` | 语音切片样例 | 1.1 / 1.2 / 1.3 秒 |
| `audio/clip_0N_wave.png` | 波形预览（可选） | — |

再生命令：`node scripts/generate-samples.mjs`（可用 `FFMPEG` 环境变量指定可执行文件）。路径清单见 `src/mock/seed/media-manifest.js`。

## 兼容保留（旧手写行 / QC SAMPLE_RESOURCES）

| 路径 | 用途 |
|------|------|
| `images/desk_seg.jpg` | 图像语义分割 / OCR+YOLO 预标预览 |
| `images/desk_grasp.jpg` | 备选桌面抓取静帧 |
| `video/bin_pick.mp4` | 历史视频目标检测样例（新 episode 已改用 ep_0N） |
| `video/bin_pick_poster.jpg` | bin_pick 封面 |
| `audio/instruction.wav` | 语音切片可播放样例 |
| `audio/instruction_wave.png` | 波形预览图 |
| `pointcloud/desk_pc.png` | 点云分割示意 |
| `text/ticket_desensitized.txt` | 文本 NER 原文 |

SVG 文件为早期占位，页面已优先使用真实媒体路径。