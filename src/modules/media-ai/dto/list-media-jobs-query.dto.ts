import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { MediaJobStatus } from '../enums/media-job-status.enum';
import { MediaJobType } from '../enums/media-job-type.enum';

export class ListMediaJobsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;

  @ApiPropertyOptional({ enum: MediaJobStatus })
  @IsOptional()
  @IsEnum(MediaJobStatus)
  status?: MediaJobStatus;

  @ApiPropertyOptional({ enum: MediaJobType })
  @IsOptional()
  @IsEnum(MediaJobType)
  type?: MediaJobType;
}
