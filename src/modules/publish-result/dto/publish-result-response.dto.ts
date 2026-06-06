import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublishResultItemSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  stepKey: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  accountId: string;

  @ApiProperty()
  accountNickname: string;

  @ApiProperty()
  videoTitle: string;

  @ApiProperty()
  publishedAt: string;
}

export class SubmitPublishResultResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  clientBatchId: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  videoCount: number;

  @ApiProperty()
  taskCount: number;

  @ApiProperty()
  successCount: number;

  @ApiProperty()
  failureCount: number;

  @ApiProperty()
  skippedNonDouyinCount: number;

  @ApiProperty({ nullable: true })
  draftId: string | null;

  @ApiProperty()
  startedAt: string;

  @ApiProperty()
  finishedAt: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({ type: [PublishResultItemSummaryDto] })
  items: PublishResultItemSummaryDto[];
}

export class PublishResultListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  videoCount: number;

  @ApiProperty()
  taskCount: number;

  @ApiProperty()
  successCount: number;

  @ApiProperty()
  failureCount: number;

  @ApiProperty()
  finishedAt: string;

  @ApiProperty({ example: '草原好物开箱 等 2 个视频' })
  summaryTitle: string;

  @ApiProperty({ type: [String] })
  accountsPreview: string[];
}

export class PublishResultListResponseDto {
  @ApiProperty({ type: [PublishResultListItemDto] })
  items: PublishResultListItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;
}

export class PublishResultItemDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  stepKey: string;

  @ApiProperty()
  entryClientId: string;

  @ApiProperty({ nullable: true })
  draftItemClientId: string | null;

  @ApiProperty()
  accountId: string;

  @ApiProperty()
  platformId: string;

  @ApiProperty()
  accountNickname: string;

  @ApiProperty({ nullable: true })
  accountOpenId: string | null;

  @ApiProperty()
  videoTitle: string;

  @ApiProperty()
  videoDescription: string;

  @ApiProperty({ type: [String], nullable: true })
  topics: string[] | null;

  @ApiProperty({ type: [String], nullable: true })
  tags: string[] | null;

  @ApiProperty({ nullable: true })
  videoFileName: string | null;

  @ApiProperty({ nullable: true })
  videoLocalPathHash: string | null;

  @ApiProperty({ nullable: true })
  douyinPublishTag: string | null;

  @ApiProperty({ type: 'array', items: { type: 'object' }, nullable: true })
  douyinCartItems: Array<{ title: string; link: string }> | null;

  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  location: { id: string; name: string; address: string } | null;

  @ApiProperty({ nullable: true })
  scheduleAt: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty({ nullable: true })
  errorCode: string | null;

  @ApiProperty({ nullable: true })
  errorMessage: string | null;

  @ApiProperty({ nullable: true })
  platformWorkId: string | null;

  @ApiProperty({ nullable: true })
  platformWorkUrl: string | null;

  @ApiProperty()
  publishedAt: string;
}

export class PublishResultDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  clientBatchId: string | null;

  @ApiProperty({ nullable: true })
  draftId: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  platformScope: string;

  @ApiProperty()
  publishMethod: string;

  @ApiProperty()
  videoCount: number;

  @ApiProperty()
  taskCount: number;

  @ApiProperty()
  successCount: number;

  @ApiProperty()
  failureCount: number;

  @ApiProperty()
  skippedNonDouyinCount: number;

  @ApiProperty()
  startedAt: string;

  @ApiProperty()
  finishedAt: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({ type: [PublishResultItemDetailDto] })
  items: PublishResultItemDetailDto[];
}
