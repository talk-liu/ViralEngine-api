/** IndexTTS2 推理参数默认值与约束（与 WebUI / infer_v2 对齐） */
export const INDEXTTS2_PARAM_LIMITS = {
  maxTextTokens: 600,
  maxMelTokens: 1815,
} as const;

export const INDEXTTS2_PARAM_DEFAULTS = {
  emoControlMethod: 0,
  emoWeight: 0.65,
  emoRandom: false,
  maxTextTokensPerSegment: 120,
  intervalSilence: 200,
  verbose: false,
  doSample: true,
  topP: 0.8,
  topK: 30,
  temperature: 0.8,
  lengthPenalty: 0,
  /** API 异步任务默认 1（更快）；WebUI 常用 3 偏质量 */
  numBeams: 1,
  repetitionPenalty: 10,
  maxMelTokens: 1500,
} as const;

export const INDEXTTS2_EMO_CONTROL_LABELS = [
  'speaker',
  'emo_audio',
  'emo_vector',
  'emo_text',
] as const;

export type IndexTts2ParamFieldSchema = {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'number[]';
  description: string;
  default?: string | number | boolean | number[];
  minimum?: number;
  maximum?: number;
  step?: number;
  enum?: (string | number)[];
  enumLabels?: string[];
  required?: boolean;
};

export const INDEXTTS2_REQUEST_PARAM_SCHEMA: IndexTts2ParamFieldSchema[] = [
  {
    name: 'text',
    type: 'string',
    description: '待合成文本',
    required: true,
  },
  {
    name: 'emoControlMethod',
    type: 'enum',
    description:
      '情感控制：0=音色参考同源，1=情感参考音频，2=情感向量，3=情感描述文本（实验）',
    default: INDEXTTS2_PARAM_DEFAULTS.emoControlMethod,
    enum: [0, 1, 2, 3],
    enumLabels: [...INDEXTTS2_EMO_CONTROL_LABELS],
  },
  {
    name: 'emoWeight',
    type: 'number',
    description: '情感权重（emo_alpha）',
    default: INDEXTTS2_PARAM_DEFAULTS.emoWeight,
    minimum: 0,
    maximum: 1,
    step: 0.01,
  },
  {
    name: 'emoVector',
    type: 'number[]',
    description:
      '情感向量 JSON 数组，8 维：[喜,怒,哀,惧,厌恶,低落,惊喜,平静]。仅 emoControlMethod=2 时生效',
  },
  {
    name: 'emoText',
    type: 'string',
    description: '情感描述文本；emoControlMethod=3 时使用，留空则用主文本',
  },
  {
    name: 'emoRandom',
    type: 'boolean',
    description: '情感随机采样',
    default: INDEXTTS2_PARAM_DEFAULTS.emoRandom,
  },
  {
    name: 'maxTextTokensPerSegment',
    type: 'number',
    description: '分句最大 Token 数，建议 80~200',
    default: INDEXTTS2_PARAM_DEFAULTS.maxTextTokensPerSegment,
    minimum: 20,
    maximum: INDEXTTS2_PARAM_LIMITS.maxTextTokens,
    step: 2,
  },
  {
    name: 'intervalSilence',
    type: 'number',
    description: '句间静音时长（毫秒）',
    default: INDEXTTS2_PARAM_DEFAULTS.intervalSilence,
    minimum: 0,
    maximum: 5000,
    step: 10,
  },
  {
    name: 'verbose',
    type: 'boolean',
    description: '是否输出详细推理日志',
    default: INDEXTTS2_PARAM_DEFAULTS.verbose,
  },
  {
    name: 'doSample',
    type: 'boolean',
    description: 'GPT2 是否采样',
    default: INDEXTTS2_PARAM_DEFAULTS.doSample,
  },
  {
    name: 'topP',
    type: 'number',
    description: 'nucleus sampling top_p',
    default: INDEXTTS2_PARAM_DEFAULTS.topP,
    minimum: 0,
    maximum: 1,
    step: 0.01,
  },
  {
    name: 'topK',
    type: 'number',
    description: 'top_k，0 表示不启用',
    default: INDEXTTS2_PARAM_DEFAULTS.topK,
    minimum: 0,
    maximum: 100,
    step: 1,
  },
  {
    name: 'temperature',
    type: 'number',
    description: '采样温度',
    default: INDEXTTS2_PARAM_DEFAULTS.temperature,
    minimum: 0.1,
    maximum: 2,
    step: 0.1,
  },
  {
    name: 'lengthPenalty',
    type: 'number',
    description: 'beam search length_penalty',
    default: INDEXTTS2_PARAM_DEFAULTS.lengthPenalty,
    minimum: -2,
    maximum: 2,
    step: 0.1,
  },
  {
    name: 'numBeams',
    type: 'number',
    description: 'beam 数量',
    default: INDEXTTS2_PARAM_DEFAULTS.numBeams,
    minimum: 1,
    maximum: 10,
    step: 1,
  },
  {
    name: 'repetitionPenalty',
    type: 'number',
    description: '重复惩罚系数',
    default: INDEXTTS2_PARAM_DEFAULTS.repetitionPenalty,
    minimum: 0.1,
    maximum: 20,
    step: 0.1,
  },
  {
    name: 'maxMelTokens',
    type: 'number',
    description: '生成 mel token 上限，过小会导致音频截断',
    default: INDEXTTS2_PARAM_DEFAULTS.maxMelTokens,
    minimum: 50,
    maximum: INDEXTTS2_PARAM_LIMITS.maxMelTokens,
    step: 10,
  },
];
