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

  @ApiProperty({ type: PublishDraftPayloadDto })
  @ValidateNested()
  @Type(() => PublishDraftPayloadDto)
  payload: PublishDraftPayloadDto;
}
