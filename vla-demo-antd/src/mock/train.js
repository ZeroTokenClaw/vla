/** Orion 算法工场 mock：算法版本、模型、GPU 卡、实验种子 */

export const ALGORITHMS = [
  { value: 'vla_policy', label: 'VLA 策略微调', versions: ['v1.2.0', 'v1.3.0', 'v1.4.1-beta'] },
  { value: 'det_yolo', label: '检测 YOLO 微调', versions: ['v8.0', 'v8.2', 'v11.0'] },
  { value: 'seg_mask2former', label: '分割 Mask2Former', versions: ['v0.9', 'v1.0'] },
  { value: 'ner_bert', label: '文本 NER 微调', versions: ['v2.1', 'v2.3'] },
]

export const MODELS = [
  { value: 'rt1_base', label: 'RT-1 Base', algo: 'vla_policy' },
  { value: 'openvla_7b', label: 'OpenVLA-7B', algo: 'vla_policy' },
  { value: 'yolov8n', label: 'YOLOv8n', algo: 'det_yolo' },
  { value: 'yolov8m', label: 'YOLOv8m', algo: 'det_yolo' },
  { value: 'mask2former_swin', label: 'Mask2Former-Swin', algo: 'seg_mask2former' },
  { value: 'bert_base_zh', label: 'BERT-Base-ZH', algo: 'ner_bert' },
]

export const GPU_CARDS = [
  { id: 'gpu-0', name: 'NVIDIA A100-0', memoryGb: 80, free: true },
  { id: 'gpu-1', name: 'NVIDIA A100-1', memoryGb: 80, free: true },
  { id: 'gpu-2', name: 'NVIDIA V100-0', memoryGb: 32, free: true },
  { id: 'gpu-3', name: 'NVIDIA V100-1', memoryGb: 32, free: false },
  { id: 'gpu-4', name: 'NVIDIA T4-0', memoryGb: 16, free: true },
]

export const AUGMENT_OPTIONS = [
  { value: 'flip', label: '水平翻转' },
  { value: 'color_jitter', label: '颜色抖动' },
  { value: 'crop', label: '随机裁剪' },
  { value: 'mixup', label: 'MixUp' },
]

function series(n, start, end, noise = 0.02) {
  const out = []
  for (let i = 0; i < n; i += 1) {
    const t = n === 1 ? 1 : i / (n - 1)
    const base = start + (end - start) * t
    const wobble = Math.sin(i * 1.7) * noise
    out.push(Number((base + wobble).toFixed(4)))
  }
  return out
}

/** Seed experiments with ORN-EXP- prefix */
export const EXPERIMENTS = [
  {
    id: 'ORN-EXP-2026-001',
    name: '仓拣 VLA 策略-基线',
    algorithm: 'vla_policy',
    version: 'v1.3.0',
    model: 'openvla_7b',
    batchSize: 8,
    learningRate: 0.0001,
    epochs: 20,
    augment: true,
    augmentOps: ['flip', 'color_jitter'],
    gpuIds: ['gpu-0', 'gpu-1'],
    status: 'finished',
    currentEpoch: 20,
    createdAt: '2026-11-02 09:20:00',
    startedAt: '2026-11-02 09:35:00',
    finishedAt: '2026-11-02 14:10:00',
    logs: [
      { at: '2026-11-02 09:35:00', level: 'info', message: '分配 GPU：NVIDIA A100-0, NVIDIA A100-1' },
      { at: '2026-11-02 09:36:12', level: 'info', message: '数据增强已开启：flip, color_jitter' },
      { at: '2026-11-02 14:10:00', level: 'success', message: '训练完成 epoch 20/20' },
    ],
    metrics: {
      loss: series(20, 2.4, 0.42, 0.05),
      acc: series(20, 0.38, 0.91, 0.015),
      map: series(20, 0.22, 0.78, 0.02),
    },
  },
  {
    id: 'ORN-EXP-2026-002',
    name: 'YOLO 料箱检测-增广对比',
    algorithm: 'det_yolo',
    version: 'v8.2',
    model: 'yolov8m',
    batchSize: 16,
    learningRate: 0.001,
    epochs: 30,
    augment: true,
    augmentOps: ['flip', 'crop', 'mixup'],
    gpuIds: ['gpu-2'],
    status: 'ready',
    currentEpoch: 0,
    createdAt: '2026-11-03 16:05:00',
    startedAt: null,
    finishedAt: null,
    logs: [
      { at: '2026-11-03 16:05:00', level: 'info', message: '实验已创建，等待启动' },
      { at: '2026-11-03 16:06:20', level: 'info', message: '已分配 GPU：NVIDIA V100-0' },
    ],
    metrics: { loss: [], acc: [], map: [] },
  },
  {
    id: 'ORN-EXP-2026-003',
    name: '桌面分割 Mask2Former',
    algorithm: 'seg_mask2former',
    version: 'v1.0',
    model: 'mask2former_swin',
    batchSize: 4,
    learningRate: 0.00005,
    epochs: 15,
    augment: false,
    augmentOps: [],
    gpuIds: [],
    status: 'draft',
    currentEpoch: 0,
    createdAt: '2026-11-04 08:40:00',
    startedAt: null,
    finishedAt: null,
    logs: [{ at: '2026-11-04 08:40:00', level: 'info', message: '草稿实验，尚未分配 GPU' }],
    metrics: { loss: [], acc: [], map: [] },
  },
]

export function nextExpId(seq) {
  const n = String(seq).padStart(3, '0')
  return `ORN-EXP-2026-${n}`
}

/** Build one mock metric point for epoch e (1-based) of total epochs. */
export function mockMetricPoint(epoch, epochs) {
  const t = epochs <= 1 ? 1 : (epoch - 1) / (epochs - 1)
  const loss = Number((2.2 - 1.7 * t + Math.sin(epoch) * 0.04).toFixed(4))
  const acc = Number((0.35 + 0.55 * t + Math.cos(epoch * 0.7) * 0.01).toFixed(4))
  const map = Number((0.2 + 0.58 * t + Math.sin(epoch * 0.5) * 0.015).toFixed(4))
  return {
    loss: Math.max(0.05, loss),
    acc: Math.min(0.99, Math.max(0.01, acc)),
    map: Math.min(0.99, Math.max(0.01, map)),
  }
}
