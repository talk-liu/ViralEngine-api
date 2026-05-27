import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PublishDraftPayloadDto } from './publish-draft-payload.dto';

export class PublishDraftSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  listTitle: string;

  @ApiProperty({ nullable: true })
  videoFileName: string | null;

  @ApiProperty({ example: 'draft' })
  status: string;

  @ApiProperty()
  hasVideo: boolean;

  @ApiPropertyOptional()
  coverPreviewUrl?: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty()
  createdAt: string;
}

export class PublishDraftListResultDto {
  @ApiProperty({ type: [PublishDraftSummaryDto] })
  items: PublishDraftSummaryDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;
}

export class PublishDraftDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  listTitle: string;

  @ApiProperty({ nullable: true })
  videoFileName: string | null;

  @ApiProperty({ nullable: true })
  videoAssetId: string | null;

  @ApiProperty({ nullable: true })
  videoUrl: string | null;

  @ApiProperty({
    nullable: true,
    example: 'D:\\Videos\\summer.mp4',
    description: '本机视频绝对路径；仅本地路径时 videoUrl 为 null',
  })
  videoLocalPath: string | null;

  @ApiProperty({ example: 'draft' })
  status: string;

  @ApiProperty({ type: PublishDraftPayloadDto })
  payload: PublishDraftPayloadDto;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
  platformCoverUrls: Record<string, string>;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class DraftVideoUploadResultDto {
  @ApiProperty()
  videoAssetId: string;

  @ApiProperty()
  videoFileName: string;

  @ApiProperty({ nullable: true })
  videoUrl: string | null;

  @ApiProperty()
  fileSize: number;
}

export class DraftCoverUploadResultDto {
  @ApiProperty()
  platformId: string;

  @ApiProperty()
  coverAssetId: string;

  @ApiProperty({ nullable: true })
  coverUrl: string | null;
}
