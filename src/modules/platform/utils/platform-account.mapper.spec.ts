import { BindStatus } from '../enums/bind-status.enum';
import { PlatformId } from '../enums/platform-id.enum';
import { PlatformAccount } from '../entities/platform-account.entity';
import { OAuthBindSession } from '../entities/oauth-bind-session.entity';
import {
  addSeconds,
  generateOAuthState,
  maskOpenId,
  toBoundAccountDto,
  toBindingPlaceholder,
} from './platform-account.mapper';

describe('platform-account.mapper', () => {
  const now = new Date('2026-06-06T08:00:00.000Z');

  const account: PlatformAccount = {
    id: 'acc-1',
    userId: 'user-1',
    platformId: PlatformId.DOUYIN,
    nickname: '测试账号',
    avatarUrl: 'https://example.com/avatar.png',
    openId: '1234567890123456',
    status: BindStatus.BOUND,
    boundAt: now,
    createdAt: now,
    updatedAt: now,
    expiresAt: null,
    lastError: null,
    user: {} as PlatformAccount['user'],
    token: {} as PlatformAccount['token'],
  };

  describe('maskOpenId', () => {
    it('长 openId 应中间掩码', () => {
      expect(maskOpenId('1234567890123456')).toBe('1234****3456');
    });

    it('短 openId 应保留前缀', () => {
      expect(maskOpenId('12345678')).toBe('12****');
    });
  });

  describe('toBoundAccountDto', () => {
    it('应映射账号并掩码 openId', () => {
      const dto = toBoundAccountDto(account);
      expect(dto.platformName).toBe('抖音');
      expect(dto.openId).toBe('1234****3456');
      expect(dto.boundAt).toBe(now.toISOString());
    });
  });

  describe('toBindingPlaceholder', () => {
    it('应生成绑定中占位信息', () => {
      const session: OAuthBindSession = {
        id: 'session-1',
        userId: 'user-1',
        platformId: PlatformId.KUAISHOU,
        state: 'state',
        status: {} as OAuthBindSession['status'],
        expiresAt: now,
        createdAt: now,
        updatedAt: now,
        user: {} as OAuthBindSession['user'],
        accountId: null,
        errorMessage: null,
      };

      const dto = toBindingPlaceholder(session);
      expect(dto.status).toBe(BindStatus.BINDING);
      expect(dto.nickname).toBe('等待浏览器授权…');
    });
  });

  describe('addSeconds', () => {
    it('应在原时间上增加秒数', () => {
      expect(addSeconds(now, 900).getTime()).toBe(now.getTime() + 900_000);
    });
  });

  describe('generateOAuthState', () => {
    it('应生成非空 state', () => {
      expect(generateOAuthState()).toMatch(/^[a-z0-9]+_[a-z0-9]+$/);
    });
  });
});
