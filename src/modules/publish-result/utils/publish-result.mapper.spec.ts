import { PublishBatchItem } from '../entities/publish-batch-item.entity';
import { PublishBatch } from '../entities/publish-batch.entity';
import { PublishBatchItemStatus } from '../enums/publish-batch-item-status.enum';
import { PublishBatchStatus } from '../enums/publish-batch-status.enum';
import { PlatformId } from '../../platform/enums/platform-id.enum';
import {
  batchToNormalizedPayload,
  buildAccountsPreview,
  buildSummaryTitle,
  normalizeSubmitPayload,
  toDetail,
} from './publish-result.mapper';

describe('publish-result.mapper', () => {
  const now = new Date('2026-06-06T08:00:00.000Z');

  const batch: PublishBatch = {
    id: 'batch-1',
    userId: 'user-1',
    clientBatchId: 'client-1',
    publishSessionKey: 'session-1',
    draftId: 'draft-1',
    status: PublishBatchStatus.SUCCESS,
    platformScope: 'douyin',
    publishMethod: 'api',
    videoCount: 2,
    taskCount: 2,
    successCount: 2,
    failureCount: 0,
    skippedNonDouyinCount: 0,
    startedAt: now,
    finishedAt: now,
    createdAt: now,
    updatedAt: now,
    items: [],
    user: {} as PublishBatch['user'],
  };

  const items: PublishBatchItem[] = [
    {
      id: 'item-2',
      batchId: 'batch-1',
      userId: 'user-1',
      stepKey: 'step-b',
      entryClientId: 'e1',
      draftItemClientId: null,
      accountId: 'acc-2',
      platformId: PlatformId.DOUYIN,
      accountNickname: '账号B',
      accountOpenId: 'oid2',
      videoTitle: '视频B',
      videoDescription: '',
      topics: null,
      tags: null,
      videoFileName: null,
      videoLocalPathHash: null,
      douyinPublishTag: null,
      douyinCartItems: null,
      location: null,
      scheduleAt: null,
      status: PublishBatchItemStatus.SUCCESS,
      errorCode: null,
      errorMessage: null,
      platformWorkId: null,
      platformWorkUrl: null,
      publishedAt: now,
      createdAt: now,
      batch: {} as PublishBatchItem['batch'],
      user: {} as PublishBatchItem['user'],
    },
    {
      id: 'item-1',
      batchId: 'batch-1',
      userId: 'user-1',
      stepKey: 'step-a',
      entryClientId: 'e1',
      draftItemClientId: null,
      accountId: 'acc-1',
      platformId: PlatformId.DOUYIN,
      accountNickname: '账号A',
      accountOpenId: 'oid1',
      videoTitle: '视频A',
      videoDescription: '',
      topics: null,
      tags: null,
      videoFileName: null,
      videoLocalPathHash: null,
      douyinPublishTag: null,
      douyinCartItems: null,
      location: null,
      scheduleAt: null,
      status: PublishBatchItemStatus.SUCCESS,
      errorCode: null,
      errorMessage: null,
      platformWorkId: null,
      platformWorkUrl: null,
      publishedAt: now,
      createdAt: now,
      batch: {} as PublishBatchItem['batch'],
      user: {} as PublishBatchItem['user'],
    },
  ];

  describe('buildSummaryTitle', () => {
    it('单视频应返回首个成功项标题', () => {
      expect(buildSummaryTitle(items, 1)).toBe('视频B');
    });

    it('多视频应附加数量说明', () => {
      expect(buildSummaryTitle(items, 2)).toBe('视频B 等 2 个视频');
    });
  });

  describe('buildAccountsPreview', () => {
    it('应按出现顺序去重账号昵称', () => {
      expect(buildAccountsPreview(items)).toEqual(['账号B', '账号A']);
    });
  });

  describe('normalizeSubmitPayload / batchToNormalizedPayload', () => {
    it('相同内容应产生相同 JSON', () => {
      const dto = {
        publishSessionKey: 'session-1',
        draftId: 'draft-1',
        status: PublishBatchStatus.SUCCESS,
        platformScope: 'douyin',
        publishMethod: 'api',
        videoCount: 2,
        taskCount: 2,
        successCount: 2,
        failureCount: 0,
        skippedNonDouyinCount: 0,
        startedAt: now.toISOString(),
        finishedAt: now.toISOString(),
        items: items.map((item) => ({
          stepKey: item.stepKey,
          entryClientId: item.entryClientId,
          draftItemClientId: item.draftItemClientId,
          accountId: item.accountId,
          platformId: item.platformId,
          accountNickname: item.accountNickname,
          accountOpenId: item.accountOpenId,
          videoTitle: item.videoTitle,
          videoDescription: item.videoDescription,
          status: item.status,
          publishedAt: item.publishedAt.toISOString(),
        })),
      };

      expect(normalizeSubmitPayload(dto)).toBe(
        batchToNormalizedPayload(batch, items),
      );
    });
  });

  describe('toDetail', () => {
    it('应映射批次详情', () => {
      const detail = toDetail(batch, items);
      expect(detail.id).toBe('batch-1');
      expect(detail.items).toHaveLength(2);
      expect(detail.items[0].stepKey).toBeDefined();
    });
  });
});
