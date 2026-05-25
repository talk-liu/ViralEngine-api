import { PlatformId } from '../enums/platform-id.enum';
import { BindStatus } from '../enums/bind-status.enum';
import { PlatformAccount } from '../entities/platform-account.entity';
import { OAuthBindSession } from '../entities/oauth-bind-session.entity';
import { getPlatformName } from '../constants/platforms.config';

export function maskOpenId(openId: string): string {
  if (openId.length <= 8) {
    return `${openId.slice(0, 2)}****`;
  }

  return `${openId.slice(0, 4)}****${openId.slice(-4)}`;
}

export function toIsoString(date: Date | null | undefined): string | undefined {
  return date ? date.toISOString() : undefined;
}

export interface BoundAccountDto {
  id: string;
  platformId: PlatformId;
  platformName: string;
  nickname: string;
  avatarUrl: string;
  openId: string;
  status: BindStatus;
  boundAt: string;
  expiresAt?: string;
  lastError?: string;
}

export function toBoundAccountDto(
  account: PlatformAccount,
): BoundAccountDto {
  return {
    id: account.id,
    platformId: account.platformId,
    platformName: getPlatformName(account.platformId),
    nickname: account.nickname,
    avatarUrl: account.avatarUrl,
    openId: maskOpenId(account.openId),
    status: account.status,
    boundAt: (account.boundAt ?? account.createdAt).toISOString(),
    expiresAt: toIsoString(account.expiresAt),
    lastError: account.lastError ?? undefined,
  };
}

export function toBindingPlaceholder(
  session: OAuthBindSession,
): BoundAccountDto {
  return {
    id: session.id,
    platformId: session.platformId,
    platformName: getPlatformName(session.platformId),
    nickname: '等待浏览器授权…',
    avatarUrl: '',
    openId: '****',
    status: BindStatus.BINDING,
    boundAt: session.createdAt.toISOString(),
  };
}

export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

export function generateOAuthState(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
