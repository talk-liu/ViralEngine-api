import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { PublishDraftPayloadDto } from './publish-draft-payload.dto';

export class SavePublishDraftDto {
  @ApiPropertyOptional({ example: 'summer.mp4', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  videoFileName?: string | null;

  @ApiPropertyOptional({
    example: 'D:\\Videos\\summer.mp4',
    nullable: true,
    description: '客户端本机视频绝对路径（元数据，服务端不读取文件）',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  videoLocalPath?: string | null;

  @ApiProperty({ type: PublishDraftPayloadDto })
  @ValidateNested()
  @Type(() => PublishDraftPayloadDto)
  payload: PublishDraftPayloadDto;
}
