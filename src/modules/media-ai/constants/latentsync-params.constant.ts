/** LatentSync 推理参数默认值（与 scripts/inference.py 对齐） */
export const LATENTSYNC_PARAM_DEFAULTS = {
  seed: 1247,
  inferenceSteps: 20,
  guidanceScale: 1.5,
  enableDeepcache: true,
  landmarkSmoothAlpha: 0.7,
} as const;

export type LatentSyncParamFieldSchema = {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  description: string;
  default?: string | number | boolean;
  minimum?: number;
  maximum?: number;
  enum?: (string | number)[];
  required?: boolean;
};

export const LATENTSYNC_REQUEST_PARAM_SCHEMA: LatentSyncParamFieldSchema[] = [
  {
    name: 'seed',
    type: 'number',
    description: '随机种子，用于可复现生成；默认 1247',
    default: LATENTSYNC_PARAM_DEFAULTS.seed,
    minimum: -1,
    maximum: 2147483647,
  },
  {
    name: 'inferenceSteps',
    type: 'number',
    description: '扩散推理步数，越大画质越稳但越慢；默认 20',
    default: LATENTSYNC_PARAM_DEFAULTS.inferenceSteps,
    minimum: 1,
    maximum: 100,
  },
  {
    name: 'guidanceScale',
    type: 'number',
    description: '引导系数，推荐 1.0–3.0；默认 1.5',
    default: LATENTSYNC_PARAM_DEFAULTS.guidanceScale,
    minimum: 0.5,
    maximum: 5,
  },
  {
    name: 'enableDeepcache',
    type: 'boolean',
    description: '是否启用 DeepCache 加速推理；默认开启',
    default: LATENTSYNC_PARAM_DEFAULTS.enableDeepcache,
  },
  {
    name: 'landmarkSmoothAlpha',
    type: 'number',
    description:
      '人脸关键点时序平滑系数，0 关闭；运动主体推荐 0.5–0.8；默认 0.7',
    default: LATENTSYNC_PARAM_DEFAULTS.landmarkSmoothAlpha,
    minimum: 0,
    maximum: 1,
  },
];
