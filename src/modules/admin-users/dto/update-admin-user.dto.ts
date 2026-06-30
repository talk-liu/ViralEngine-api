import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional } from 'class-validator';

export class UpdateAdminUserDto {
  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59.000Z',
    description: '会员到期时间',
  })
  @IsOptional()
  @IsDateString({}, { message: '会员到期时间格式不正确' })
  membershipExpiresAt?: string;

  @ApiPropertyOptional({ example: false, description: '是否禁用账号' })
  @IsOptional()
  @IsBoolean()
  isDisabled?: boolean;
}
