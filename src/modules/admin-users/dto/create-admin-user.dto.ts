import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, Matches } from 'class-validator';

export class CreateAdminUserDto {
  @ApiProperty({ example: '13800138000', description: '手机号' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({
    example: '2026-12-31T23:59:59.000Z',
    description: '会员到期时间',
  })
  @IsDateString({}, { message: '会员到期时间格式不正确' })
  membershipExpiresAt: string;
}
