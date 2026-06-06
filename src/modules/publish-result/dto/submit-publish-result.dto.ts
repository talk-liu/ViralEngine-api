import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PublishBatchItemStatus } from '../enums/publish-batch-item-status.enum';
import { PublishBatchStatus } from '../enums/publish-batch-status.enum';

export class PublishLocationSnapshotDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  name: string;

  @ApiProperty()
  @IsString()
  @MaxLength(512)
  address: string;
}

export class PublishCartItemSnapshotDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  link: string;
}

export class SubmitPublishResultItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  stepKey: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  entryClientId: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  draftItemClientId?: string | null;

  @ApiProperty()
  @IsUUID()
  accountId: string;

  @ApiProperty({ example: 'douyin' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  platformId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  accountNickname: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  accountOpenId?: string | null;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  videoTitle: string;

  @ApiPropertyOptional({ default: '' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  videoDescription?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  topics?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  videoFileName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  videoLocalPathHash?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  douyinPublishTag?: string | null;

  @ApiPropertyOptional({ type: [PublishCartItemSnapshotDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublishCartItemSnapshotDto)
  douyinCartItems?: PublishCartItemSnapshotDto[];

  @ApiPropertyOptional({ type: PublishLocationSnapshotDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => PublishLocationSnapshotDto)
  location?: PublishLocationSnapshotDto | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  scheduleAt?: string | null;

  @ApiProperty({ enum: PublishBatchItemStatus })
  @IsEnum(PublishBatchItemStatus)
  status: PublishBatchItemStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  errorCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  errorMessage?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  platformWorkId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  platformWorkUrl?: string | null;

  @ApiProperty()
  @IsDateString()
  publishedAt: string;
}

export class SubmitPublishResultDto {
  @ApiPropertyOptional({ description: '客户端幂等键' })
  @IsOptional()
  @IsUUID()
  clientBatchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  publishSessionKey?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  draftId?: string | null;

  @ApiProperty({ enum: PublishBatchStatus })
  @IsEnum(PublishBatchStatus)
  status: PublishBatchStatus;

  @ApiProperty({ example: 'douyin' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  platformScope: string;

  @ApiProperty({ example: 'creator_center_webview' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  publishMethod: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  videoCount: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  taskCount: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  successCount: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  failureCount: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skippedNonDouyinCount?: number;

  @ApiProperty()
  @IsDateString()
  startedAt: string;

  @ApiProperty()
  @IsDateString()
  finishedAt: string;

  @ApiProperty({ type: [SubmitPublishResultItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitPublishResultItemDto)
  items: SubmitPublishResultItemDto[];
}
