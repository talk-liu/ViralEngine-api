import { ApiProperty } from '@nestjs/swagger';
import {
  INDEXTTS2_EMO_CONTROL_LABELS,
  INDEXTTS2_PARAM_DEFAULTS,
  INDEXTTS2_PARAM_LIMITS,
  INDEXTTS2_REQUEST_PARAM_SCHEMA,
  type IndexTts2ParamFieldSchema,
} from '../constants/indextts2-params.constant';

export class IndexTts2ParamFieldDto implements IndexTts2ParamFieldSchema {
  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['string', 'number', 'boolean', 'enum', 'number[]'] })
  type: IndexTts2ParamFieldSchema['type'];

  @ApiProperty()
  description: string;

  @ApiProperty({ required: false })
  default?: string | number | boolean | number[];

  @ApiProperty({ required: false })
  minimum?: number;

  @ApiProperty({ required: false })
  maximum?: number;

  @ApiProperty({ required: false })
  step?: number;

  @ApiProperty({ required: false, isArray: true })
  enum?: (string | number)[];

  @ApiProperty({ required: false, isArray: true })
  enumLabels?: string[];

  @ApiProperty({ required: false })
  required?: boolean;
}

export class IndexTts2ParamsSchemaDto {
  @ApiProperty({ example: 'IndexTTS2' })
  model: string;

  @ApiProperty({ example: '1.0' })
  modelVersion: string;

  @ApiProperty({
    description: 'multipart 字段：音色参考音频（必填）',
    example: 'spkFile',
  })
  spkFileField: string;

  @ApiProperty({
    description: 'multipart 字段：情感参考音频（emoControlMethod=1 时必填）',
    example: 'emoFile',
  })
  emoFileField: string;

  @ApiProperty({ type: [IndexTts2ParamFieldDto] })
  params: IndexTts2ParamFieldDto[];

  @ApiProperty({
    example: {
      maxTextTokens: INDEXTTS2_PARAM_LIMITS.maxTextTokens,
      maxMelTokens: INDEXTTS2_PARAM_LIMITS.maxMelTokens,
    },
  })
  limits: typeof INDEXTTS2_PARAM_LIMITS;

  @ApiProperty({ example: INDEXTTS2_PARAM_DEFAULTS })
  defaults: typeof INDEXTTS2_PARAM_DEFAULTS;

  @ApiProperty({ example: INDEXTTS2_EMO_CONTROL_LABELS })
  emoControlLabels: typeof INDEXTTS2_EMO_CONTROL_LABELS;
}

export function buildIndexTts2ParamsSchema(): IndexTts2ParamsSchemaDto {
  return {
    model: 'IndexTTS2',
    modelVersion: '1.0',
    spkFileField: 'spkFile',
    emoFileField: 'emoFile',
    params: INDEXTTS2_REQUEST_PARAM_SCHEMA,
    limits: INDEXTTS2_PARAM_LIMITS,
    defaults: INDEXTTS2_PARAM_DEFAULTS,
    emoControlLabels: INDEXTTS2_EMO_CONTROL_LABELS,
  };
}
