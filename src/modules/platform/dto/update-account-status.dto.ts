import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { BindStatus } from '../enums/bind-status.enum';

const UPDATABLE_ACCOUNT_STATUSES = [
  BindStatus.BOUND,
  BindStatus.EXPIRED,
  BindStatus.ERROR,
] as const;

export class UpdateAccountStatusDto {
  @ApiProperty({
    enum: UPDATABLE_ACCOUNT_STATUSES,
    example: BindStatus.EXPIRED,
    description: '账号绑定状态（不可设为 binding / unbound）',
  })
  @IsEnum(UPDATABLE_ACCOUNT_STATUSES)
  status: (typeof UPDATABLE_ACCOUNT_STATUSES)[number];

  @ApiPropertyOptional({
    example: '授权已过期，请重新绑定',
    description: '错误说明；设为 bound 时会被清空',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  lastError?: string;
}
