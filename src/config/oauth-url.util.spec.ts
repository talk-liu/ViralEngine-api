import {
  buildLocalHttpsBaseUrl,
  buildOAuthCallbackUrl,
  normalizeBaseUrl,
  resolveOAuthRedirectUri,
} from './oauth-url.util';

describe('oauth-url.util', () => {
  describe('normalizeBaseUrl', () => {
    it('应去除尾部斜杠与空白', () => {
      expect(normalizeBaseUrl('  https://example.com/api/  ')).toBe(
        'https://example.com/api',
      );
    });

    it('空值应返回空字符串', () => {
      expect(normalizeBaseUrl(undefined)).toBe('');
    });
  });

  describe('buildLocalHttpsBaseUrl', () => {
    it('应拼接本地 HTTPS 地址', () => {
      expect(buildLocalHttpsBaseUrl('localhost', 3443)).toBe(
        'https://localhost:3443',
      );
    });
  });

  describe('buildOAuthCallbackUrl', () => {
    it('应生成 OAuth 回调 URL', () => {
      expect(buildOAuthCallbackUrl('https://example.com', 'douyin')).toBe(
        'https://example.com/api/oauth/douyin/callback',
      );
    });

    it('baseUrl 为空时应返回空字符串', () => {
      expect(buildOAuthCallbackUrl('', 'douyin')).toBe('');
    });
  });

  describe('resolveOAuthRedirectUri', () => {
    it('显式 URI 优先', () => {
      expect(
        resolveOAuthRedirectUri(
          '  https://custom/callback  ',
          'https://example.com',
          'douyin',
        ),
      ).toBe('https://custom/callback');
    });

    it('无显式 URI 时应从 baseUrl 推导', () => {
      expect(
        resolveOAuthRedirectUri(undefined, 'https://example.com', 'kuaishou'),
      ).toBe('https://example.com/api/oauth/kuaishou/callback');
    });
  });
});
