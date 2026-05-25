import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class BindStartDto {
  @ApiPropertyOptional({
    example: 'viralengine://oauth-done',
    description: 'Web 场景授权完成后的跳转地址',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  redirectAfter?: string;
}

export class BindCompleteDto {
  @ApiProperty({ example: '授权码' })
  @IsString()
  code: string;

  @ApiProperty({ example: '7c9e6679-7425-40de-944b-e07fc1f90ae7' })
  @IsString()
  bindSessionId: string;
}
