import { BadRequestException } from '@nestjs/common';
import { PlatformId } from '../../platform/enums/platform-id.enum';
import { PublishDraftAsset } from '../entities/publish-draft-asset.entity';
import {
  buildPlatformCoverUrls,
  hasDraftVideo,
  normalizePayload,
  normalizeVideoLocalPath,
  pickCoverPreviewAsset,
  resolveListTitle,
} from './publish-draft.mapper';

describe('publish-draft.mapper', () => {
  const now = new Date('2026-06-06T08:00:00.000Z');
  const later = new Date('2026-06-06T09:00:00.000Z');

  describe('normalizeVideoLocalPath', () => {
    it('null/undefined 应返回 null', () => {
      expect(normalizeVideoLocalPath(null)).toBeNull();
      expect(normalizeVideoLocalPath(undefined)).toBeNull();
    });

    it('空白字符串应返回 null', () => {
      expect(normalizeVideoLocalPath('   ')).toBeNull();
    });

    it('应 trim 有效路径', () => {
      expect(normalizeVideoLocalPath('  D:\\videos\\a.mp4  ')).toBe(
        'D:\\videos\\a.mp4',
      );
    });

    it('包含控制字符应抛出异常', () => {
      expect(() => normalizeVideoLocalPath('bad\x01path')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('hasDraftVideo', () => {
    it('有 videoAssetId 应返回 true', () => {
      expect(hasDraftVideo({ videoAssetId: 'asset-1', videoLocalPath: null })).toBe(
        true,
      );
    });

    it('有 videoLocalPath 应返回 true', () => {
      expect(
        hasDraftVideo({ videoAssetId: null, videoLocalPath: '  D:\\a.mp4  ' }),
      ).toBe(true);
    });

    it('均无应返回 false', () => {
      expect(hasDraftVideo({ videoAssetId: null, videoLocalPath: null })).toBe(
        false,
      );
    });
  });

  describe('resolveListTitle', () => {
    it('应优先使用 payload.title', () => {
      expect(resolveListTitle({ title: '  标题  ' }, 'file.mp4')).toBe('标题');
    });

    it('无标题时使用文件名', () => {
      expect(resolveListTitle({}, '  video.mp4  ')).toBe('video.mp4');
    });

    it('均无时使用默认文案', () => {
      expect(resolveListTitle({}, null)).toBe('未命名草稿');
    });
  });

  describe('pickCoverPreviewAsset', () => {
    it('应返回最新封面', () => {
      const older: PublishDraftAsset = {
        id: '1',
        draftId: 'd1',
        platformId: PlatformId.DOUYIN,
        createdAt: now,
      } as PublishDraftAsset;
      const newer: PublishDraftAsset = {
        id: '2',
        draftId: 'd1',
        platformId: PlatformId.DOUYIN,
        createdAt: later,
      } as PublishDraftAsset;

      expect(pickCoverPreviewAsset([older, newer])?.id).toBe('2');
    });
  });

  describe('buildPlatformCoverUrls', () => {
    it('每个平台应取最新封面 URL', () => {
      const assets: PublishDraftAsset[] = [
        {
          id: '1',
          platformId: PlatformId.DOUYIN,
          createdAt: now,
          storageKey: 'old',
        } as PublishDraftAsset,
        {
          id: '2',
          platformId: PlatformId.DOUYIN,
          createdAt: later,
          storageKey: 'new',
        } as PublishDraftAsset,
      ];

      const urls = buildPlatformCoverUrls(assets, (a) => `url:${a.storageKey}`);
      expect(urls[PlatformId.DOUYIN]).toBe('url:new');
    });
  });

  describe('normalizePayload', () => {
    it('应去重 accountIds 并填充默认值', () => {
      const result = normalizePayload({
        accountIds: ['a1', 'a1', 'a2'],
      });

      expect(result.accountIds).toEqual(['a1', 'a2']);
      expect(result.title).toBe('');
      expect(result.topics).toEqual([]);
    });

    it('应规范化 items', () => {
      const result = normalizePayload({
        items: [
          {
            clientId: '  c1  ',
            accountIds: ['x', 'x'],
            platformOverrides: {
              douyin: { cartItems: undefined as never },
            },
          },
        ],
      });

      expect(result.items?.[0].clientId).toBe('c1');
      expect(result.items?.[0].accountIds).toEqual(['x']);
      expect(result.items?.[0].platformOverrides?.douyin?.cartItems).toEqual([]);
    });
  });
});
