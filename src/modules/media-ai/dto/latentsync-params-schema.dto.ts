import { ApiProperty } from '@nestjs/swagger';
import {
  LATENTSYNC_PARAM_DEFAULTS,
  LATENTSYNC_REQUEST_PARAM_SCHEMA,
  type LatentSyncParamFieldSchema,
} from '../constants/latentsync-params.constant';

export class LatentSyncParamFieldDto implements LatentSyncParamFieldSchema {
  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['string', 'number', 'boolean', 'enum'] })
  type: LatentSyncParamFieldSchema['type'];

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

export class LatentSyncParamsSchemaDto {
  @ApiProperty({ example: 'LatentSync' })
  model: string;

  @ApiProperty({ example: 'stage2-512' })
  modelVersion: string;

  @ApiProperty({
    description: 'multipart 字段：待对口型的源视频（必填）',
    example: 'videoFile',
  })
  videoFileField: string;

  @ApiProperty({
    description: 'multipart 字段：驱动口型的音频（必填）',
    example: 'audioFile',
  })
  audioFileField: string;

  @ApiProperty({ type: [LatentSyncParamFieldDto] })
  params: LatentSyncParamFieldDto[];

  @ApiProperty({ example: LATENTSYNC_PARAM_DEFAULTS })
  defaults: typeof LATENTSYNC_PARAM_DEFAULTS;
}

export function buildLatentSyncParamsSchema(): LatentSyncParamsSchemaDto {
  return {
    model: 'LatentSync',
    modelVersion: 'stage2-512',
    videoFileField: 'videoFile',
    audioFileField: 'audioFile',
    params: LATENTSYNC_REQUEST_PARAM_SCHEMA,
    defaults: LATENTSYNC_PARAM_DEFAULTS,
  };
}
