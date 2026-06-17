import { ApiProperty } from '@nestjs/swagger';

export class UserBriefDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '13800138000' })
  phone: string;

  @ApiProperty({ example: 'A1B2C3D4' })
  referralCode: string;

  @ApiProperty({ example: false, description: '是否为管理员' })
  isAdmin: boolean;
}

export class AuthTokenResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ example: '7d' })
  expiresIn: string;

  @ApiProperty({ type: UserBriefDto })
  user: UserBriefDto;
}

export class CaptchaResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: '验证码 ID，登录时需一并提交',
  })
  captchaId: string;

  @ApiProperty({
    example: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0i...',
    description: 'SVG 图片（Base64 Data URL）',
  })
  image: string;
}

export class UserProfileDto extends UserBriefDto {
  @ApiProperty({ example: '2026-05-23T08:00:00.000Z' })
  createdAt: Date;
}
