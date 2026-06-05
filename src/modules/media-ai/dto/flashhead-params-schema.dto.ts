import { ApiProperty } from '@nestjs/swagger';
import {
  FLASHHEAD_PARAM_DEFAULTS,
  FLASHHEAD_REQUEST_PARAM_SCHEMA,
  type FlashHeadParamFieldSchema,
} from '../constants/flashhead-params.constant';

export class FlashHeadParamFieldDto implements FlashHeadParamFieldSchema {
  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['string', 'number', 'boolean', 'enum'] })
  type: FlashHeadParamFieldSchema['type'];

  @ApiProperty()
  description: string;

  @ApiProperty({ required: false })
  default?: string | number | boolean;

  @ApiProperty({ required: false })
  minimum?: number;

  @ApiProperty({ required: false })
  maximum?: number;

  @ApiProperty({ required: false, isArray: true })
  enum?: (string | number)[];

  @ApiProperty({ required: false })
  required?: boolean;
}

export class FlashHeadParamsSchemaDto {
  @ApiProperty({ example: 'FlashHead-Pro' })
  model: string;

  @ApiProperty({ example: '1.3B' })
  modelVersion: string;

  @ApiProperty({
    description: 'multipart 字段：人像参考图（必填）',
    example: 'portraitFile',
  })
  portraitFileField: string;

  @ApiProperty({
    description: 'multipart 字段：驱动口型的音频（必填）',
    example: 'audioFile',
  })
  audioFileField: string;

  @ApiProperty({ type: [FlashHeadParamFieldDto] })
  params: FlashHeadParamFieldDto[];

  @ApiProperty({ example: FLASHHEAD_PARAM_DEFAULTS })
  defaults: typeof FLASHHEAD_PARAM_DEFAULTS;
}

export function buildFlashHeadParamsSchema(): FlashHeadParamsSchemaDto {
  return {
    model: 'FlashHead-Pro',
    modelVersion: '1.3B',
    portraitFileField: 'portraitFile',
    audioFileField: 'audioFile',
    params: FLASHHEAD_REQUEST_PARAM_SCHEMA,
    defaults: FLASHHEAD_PARAM_DEFAULTS,
  };
}
