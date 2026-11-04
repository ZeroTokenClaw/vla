# VLA 四厂商演示系统

四个功能完整、风格互异的前端演示项目，覆盖同一套评分点（多模态质控 / 自动化预标注 / VLA 采集标注 / 算法训练验证），用于分别录制演示视频。本地 mock + 脱敏样例，无需后端。

设计文档：`docs/superpowers/specs/2026-11-04-vla-four-style-demos-design.md`  
实现计划：`docs/superpowers/plans/2026-11-04-vla-four-vendor-demos.md`  
验收清单：`docs/superpowers/plans/acceptance-checklist.md`

## 四套对比

| 产品 | 路径 | UI 库 | 端口 | 厂商人设（一句话） |
|------|------|-------|------|-------------------|
| **数联标注云** DataLink Label | `vla-demo-element` | Element Plus | **5101** | 企业蓝灰「工单流」ToB：待办工单、侧栏菜单、审计抽屉 |
| **Orion Annotate** | `vla-demo-antd` | Ant Design Vue | **5102** | 国际 SaaS：顶栏横向导航、中英混排、Product Tour + Dataset 卡片 |
| **灵眸 VLA Studio** | `vla-demo-naive` | Naive UI（深色） | **5103** | 具身智能创作台：图标轨导航、会话时间轴、底部 Console 日志 |
| **星算训练台** StarCompute | `vla-demo-arco` | Arco Design | **5104** | 云厂商算法台：GPU/实验仪表盘、算力池、Checkpoint 术语 |

任务号前缀互不撞车：`DL-` / `ORN-` / `LM-` / `SC-`。

## 启动

前置：Node.js 18+、pnpm。

```bash
# 数联 5101
cd E:\omp\vla\vla-demo-element
pnpm install && pnpm dev

# Orion 5102
cd E:\omp\vla\vla-demo-antd
pnpm install && pnpm dev

# 灵眸 5103
cd E:\omp\vla\vla-demo-naive
pnpm install && pnpm dev

# 星算 5104
cd E:\omp\vla\vla-demo-arco
pnpm install && pnpm dev
```

浏览器分别打开：

- http://127.0.0.1:5101
- http://127.0.0.1:5102
- http://127.0.0.1:5103
- http://127.0.0.1:5104

每套顶栏可切换 **标注员 / 审核员 / 管理员**（Orion 为 Annotator / Reviewer / Admin），并查看操作审计。

## 功能覆盖（四套相同）

1. **多模态标注与质控（4 分）**：文本实体 / 图像分割 / 语音切片 / 视频检测 / 点云；任务分配·流转·协作·批注·驳回·多级审核；抽检规则·随机抽检·规范·回流  
2. **自动化预标注（4 分）**：文本分类·NER·关系·结构化 + 人工修正；OCR + YOLO + 修正；确认·标注·质检·验收向导  
3. **VLA 采集与标注（8 分）**：采集任务/场景/方案/模式/模板/人员；多模态联动·动作序列·关键节点·起止帧；**JSON / Excel / CSV** 导出；抖动/遮挡/模糊/缺失/不匹配检测与过滤  
4. **算法训练与验证（4 分）**：算法/版本/模型/参数/GPU；运行控制·数据增强；loss / acc / mAP；结果与报表导出  

各项目 README 内有「评分点 → 菜单路径 → 演示要点」对照表与录屏脚本（`docs/record-script-*.md`）。

## 测试与构建

在各自目录执行：

```bash
pnpm test
pnpm build
```

## 仓库说明

- 分支：`feature/vla-four-vendor-demos`
- 四套为**完全独立** Vue3 + Vite 项目（方案 A），不共享 monorepo 包
- 样例媒体在各项目 `public/samples/`