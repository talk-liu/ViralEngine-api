import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminUserListItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '13800138000' })
  phone: string;

  @ApiProperty({ example: 'A1B2C3D4' })
  referralCode: string;

  @ApiProperty({ example: false })
  isAdmin: boolean;

  @ApiProperty({ example: false })
  isDisabled: boolean;

  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59.000Z',
    nullable: true,
    description: '会员到期时间，管理员为 null 表示永不过期',
  })
  membershipExpiresAt: string | null;

  @ApiProperty({ example: false, description: '会员是否已到期' })
  isExpired: boolean;

  @ApiProperty({ example: '2026-05-23T08:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-05-23T08:00:00.000Z' })
  updatedAt: string;
}

export class AdminUserListResponseDto {
  @ApiProperty({ type: [AdminUserListItemDto] })
  items: AdminUserListItemDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  pageSize: number;
}

export class AdminUserCreatedDto extends AdminUserListItemDto {
  @ApiProperty({
    example: 'Kx9mP2nQ4a',
    description: '初始密码（仅创建时返回一次）',
  })
  initialPassword: string;
}

export class AdminUserResetPasswordResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({
    example: 'Kx9mP2nQ4a',
    description: '新密码（仅重置时返回一次）',
  })
  newPassword: string;
}
