import { ConfigService } from '@nestjs/config';
import { DouyinOAuthProvider } from './douyin-oauth.provider';
import { KuaishouOAuthProvider } from './kuaishou-oauth.provider';

describe('DouyinOAuthProvider', () => {
  let provider: DouyinOAuthProvider;

  beforeEach(() => {
    provider = new DouyinOAuthProvider({
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          'oauth.douyin.clientKey': 'client-key',
          'oauth.douyin.clientSecret': 'client-secret',
          'oauth.douyin.redirectUri': 'https://example.com/callback',
        };
        return config[key];
      }),
    } as unknown as ConfigService);
  });

  it('isConfigured 凭证齐全时应为 true', () => {
    expect(provider.isConfigured()).toBe(true);
  });

  it('buildAuthUrl 应包含必要参数', () => {
    const url = provider.buildAuthUrl('state-123');
    expect(url).toContain('open.douyin.com');
    expect(url).toContain('client_key=client-key');
    expect(url).toContain('state=state-123');
  });

  it('exchangeCode 应解析 token 响应', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        data: {
          access_token: 'access',
          refresh_token: 'refresh',
          expires_in: 3600,
          open_id: 'openid',
        },
      }),
    });

    const result = await provider.exchangeCode('auth-code');
    expect(result.accessToken).toBe('access');
    expect(result.openId).toBe('openid');
  });

  it('exchangeCode 失败时应抛出错误', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ message: '授权失败' }),
    });

    await expect(provider.exchangeCode('bad-code')).rejects.toThrow('授权失败');
  });
});

describe('KuaishouOAuthProvider', () => {
  let provider: KuaishouOAuthProvider;

  beforeEach(() => {
    provider = new KuaishouOAuthProvider({
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          'oauth.kuaishou.appId': 'app-id',
          'oauth.kuaishou.appSecret': 'app-secret',
          'oauth.kuaishou.redirectUri': 'https://example.com/callback',
        };
        return config[key];
      }),
    } as unknown as ConfigService);
  });

  it('buildAuthUrl 应指向快手授权页', () => {
    const url = provider.buildAuthUrl('state-456');
    expect(url).toContain('open.kuaishou.com/oauth2/authorize');
    expect(url).toContain('app_id=app-id');
  });

  it('exchangeCode 应解析 token 响应', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        result: 1,
        access_token: 'access',
        refresh_token: 'refresh',
        expires_in: 3600,
        open_id: 'openid',
      }),
    });

    const result = await provider.exchangeCode('auth-code');
    expect(result.accessToken).toBe('access');
  });

  it('fetchUserInfo 应映射用户信息', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        result: 1,
        user_info: { name: '昵称', head: 'https://avatar' },
      }),
    });

    const info = await provider.fetchUserInfo('token', 'openid');
    expect(info.nickname).toBe('昵称');
    expect(info.avatarUrl).toBe('https://avatar');
  });
});
