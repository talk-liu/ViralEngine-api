import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlatformId } from '../enums/platform-id.enum';
import { BindStatus } from '../enums/bind-status.enum';

export class PlatformMetaDto {
  @ApiProperty({ enum: PlatformId, example: PlatformId.DOUYIN })
  id: PlatformId;

  @ApiProperty({ example: '抖音' })
  name: string;

  @ApiProperty({ example: 'douyin' })
  icon: string;

  @ApiProperty({ example: '字节跳动 · 短视频' })
  description: string;

  @ApiProperty({ example: true })
  enabled: boolean;
}

export class BoundAccountDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ enum: PlatformId, example: PlatformId.DOUYIN })
  platformId: PlatformId;

  @ApiProperty({ example: '抖音' })
  platformName: string;

  @ApiProperty({ example: '示例昵称' })
  nickname: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg' })
  avatarUrl: string;

  @ApiProperty({ example: '7123****8901' })
  openId: string;

  @ApiProperty({ enum: BindStatus, example: BindStatus.BOUND })
  status: BindStatus;

  @ApiProperty({ example: '2026-05-20T08:00:00.000Z' })
  boundAt: string;

  @ApiPropertyOptional({ example: '2026-06-20T08:00:00.000Z' })
  expiresAt?: string;

  @ApiPropertyOptional({ example: '授权已过期' })
  lastError?: string;
}

export class PlatformAccountViewDto {
  @ApiProperty({ type: PlatformMetaDto })
  platform: PlatformMetaDto;

  @ApiPropertyOptional({ type: [BoundAccountDto] })
  accounts?: BoundAccountDto[];
}

export class BindStartResponseDto {
  @ApiProperty({ example: '7c9e6679-7425-40de-944b-e07fc1f90ae7' })
  bindSessionId: string;

  @ApiProperty({
    example:
      'https://open.douyin.com/platform/oauth/connect?client_key=...&state=...',
  })
  authUrl: string;

  @ApiProperty({ example: 900 })
  expiresIn: number;
}

export class BindSessionResponseDto {
  @ApiProperty({
    enum: ['pending', 'success', 'failed', 'cancelled'],
    example: 'pending',
  })
  status: string;

  @ApiPropertyOptional({ type: BoundAccountDto, nullable: true })
  account: BoundAccountDto | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  error: string | null;
}

export class TokenRefreshResponseDto {
  @ApiProperty({ example: '2026-06-20T08:00:00.000Z' })
  expiresAt: string;
}

export class AccountNetworkDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  accountId: string;

  @ApiProperty({ example: true })
  enabled: boolean;

  @ApiProperty({ enum: ['none', 'http', 'socks5'], example: 'http' })
  proxyType: string;

  @ApiPropertyOptional({ example: 'proxy.example.com' })
  host?: string;

  @ApiPropertyOptional({ example: 8080 })
  port?: number;

  @ApiPropertyOptional({ example: 'user' })
  username?: string;

  @ApiProperty({ example: '' })
  password: string;

  @ApiPropertyOptional({ example: '广东-深圳' })
  regionLabel?: string;

  @ApiPropertyOptional({ example: '1.2.3.4' })
  lastIp?: string;

  @ApiPropertyOptional({ example: 'CN-Guangdong' })
  lastRegion?: string;

  @ApiPropertyOptional({ example: '2026-05-20T10:00:00.000Z' })
  lastCheckedAt?: string;
}

export class NetworkTestResultDto {
  @ApiProperty({ example: '1.2.3.4' })
  ip: string;

  @ApiProperty({ example: 'CN' })
  country: string;

  @ApiProperty({ example: 'Guangdong' })
  region: string;

  @ApiProperty({ example: 'Shenzhen' })
  city: string;

  @ApiProperty({ example: 'China Telecom' })
  isp: string;
}
