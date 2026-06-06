import { BadRequestException } from '@nestjs/common';
import { PlatformId } from '../enums/platform-id.enum';
import { OAuthProviderRegistry } from './oauth-provider.registry';
import { OAuthProvider } from './oauth/oauth-provider.interface';

describe('OAuthProviderRegistry', () => {
  const createProvider = (
    configured: boolean,
    platformId: PlatformId,
  ): OAuthProvider => ({
    platformId,
    isConfigured: () => configured,
    buildAuthUrl: jest.fn(),
    exchangeCode: jest.fn(),
    refreshAccessToken: jest.fn(),
    fetchUserInfo: jest.fn(),
  });

  let registry: OAuthProviderRegistry;
  const douyin = createProvider(true, PlatformId.DOUYIN);
  const kuaishou = createProvider(false, PlatformId.KUAISHOU);

  beforeEach(() => {
    registry = new OAuthProviderRegistry(douyin, kuaishou);
  });

  it('hasProvider 应识别已注册平台', () => {
    expect(registry.hasProvider(PlatformId.DOUYIN)).toBe(true);
    expect(registry.hasProvider(PlatformId.BILIBILI)).toBe(false);
  });

  it('未支持平台应抛出 BadRequestException', () => {
    expect(() => registry.getProvider(PlatformId.BILIBILI)).toThrow(
      BadRequestException,
    );
  });

  it('未配置凭证的平台应抛出 BadRequestException', () => {
    expect(() => registry.getProvider(PlatformId.KUAISHOU)).toThrow(
      BadRequestException,
    );
  });

  it('已配置平台应返回 provider', () => {
    expect(registry.getProvider(PlatformId.DOUYIN)).toBe(douyin);
  });
});
