import { BadRequestException } from '@nestjs/common';
import { PlatformId } from '../../platform/enums/platform-id.enum';
import {
  assertPlatformVideoUrlMatches,
  parsePlatformVideoUrl,
} from './platform-video-url.util';

describe('platform-video-url.util', () => {
  it('识别抖音精选页链接', () => {
    const parsed = parsePlatformVideoUrl(
      'https://www.douyin.com/jingxuan?modal_id=7635649097567539306',
    );
    expect(parsed.platformId).toBe(PlatformId.DOUYIN);
    expect(parsed.platformName).toBe('抖音');
    expect(parsed.normalizedUrl).toContain('modal_id=7635649097567539306');
    expect(parsed.downloadUrl).toBe(
      'https://www.douyin.com/video/7635649097567539306',
    );
  });

  it('识别抖音短链', () => {
    const parsed = parsePlatformVideoUrl('https://v.douyin.com/abc123/');
    expect(parsed.platformId).toBe(PlatformId.DOUYIN);
  });

  it('识别快手链接', () => {
    const parsed = parsePlatformVideoUrl(
      'https://www.kuaishou.com/short-video/3xabc',
    );
    expect(parsed.platformId).toBe(PlatformId.KUAISHOU);
  });

  it('识别小红书链接', () => {
    const parsed = parsePlatformVideoUrl(
      'https://www.xiaohongshu.com/explore/abc123',
    );
    expect(parsed.platformId).toBe(PlatformId.XIAOHONGSHU);
  });

  it('识别视频号链接', () => {
    const parsed = parsePlatformVideoUrl(
      'https://channels.weixin.qq.com/platform/post/abc',
    );
    expect(parsed.platformId).toBe(PlatformId.WEIXIN_CHANNELS);
  });

  it('识别 B 站链接', () => {
    const parsed = parsePlatformVideoUrl('https://www.bilibili.com/video/BV1xx');
    expect(parsed.platformId).toBe(PlatformId.BILIBILI);
  });

  it('识别 TikTok 链接', () => {
    const parsed = parsePlatformVideoUrl(
      'https://www.tiktok.com/@user/video/1234567890',
    );
    expect(parsed.platformId).toBe(PlatformId.TIKTOK);
  });

  it('自动补全缺少协议的链接', () => {
    const parsed = parsePlatformVideoUrl('www.douyin.com/video/7123456789');
    expect(parsed.normalizedUrl.startsWith('https://')).toBe(true);
    expect(parsed.platformId).toBe(PlatformId.DOUYIN);
  });

  it('拒绝不支持的平台', () => {
    expect(() => parsePlatformVideoUrl('https://www.youtube.com/watch?v=abc')).toThrow(
      BadRequestException,
    );
  });

  it('校验 platformId 与链接一致', () => {
    expect(() =>
      assertPlatformVideoUrlMatches(
        'https://www.douyin.com/video/1',
        PlatformId.KUAISHOU,
      ),
    ).toThrow(BadRequestException);
  });
});
