/** FlashHead Pro 推理参数默认值（与 generate_video.py 对齐） */
export const FLASHHEAD_PARAM_DEFAULTS = {
  seed: 42,
  useFaceCrop: true,
  audioEncodeMode: 'once' as const,
} as const;

export type FlashHeadParamFieldSchema = {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  description: string;
  default?: string | number | boolean;
  minimum?: number;
  maximum?: number;
  enum?: (string | number)[];
  required?: boolean;
};

export const FLASHHEAD_REQUEST_PARAM_SCHEMA: FlashHeadParamFieldSchema[] = [
  {
    name: 'seed',
    type: 'number',
    description: '随机种子，用于可复现生成；默认 42',
    default: FLASHHEAD_PARAM_DEFAULTS.seed,
    minimum: 0,
    maximum: 2147483647,
  },
  {
    name: 'useFaceCrop',
    type: 'boolean',
    description: '是否启用人脸检测与裁剪（推荐开启，口型对齐更稳）',
    default: FLASHHEAD_PARAM_DEFAULTS.useFaceCrop,
  },
  {
    name: 'audioEncodeMode',
    type: 'enum',
    description:
      '音频编码模式：once=整段音频一次编码（推荐）；stream=流式分块编码',
    default: FLASHHEAD_PARAM_DEFAULTS.audioEncodeMode,
    enum: ['once', 'stream'],
  },
];
