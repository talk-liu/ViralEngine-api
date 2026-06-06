import { PublishBatchItem } from '../entities/publish-batch-item.entity';
import { PublishBatch } from '../entities/publish-batch.entity';
import { SubmitPublishResultDto } from '../dto/submit-publish-result.dto';

export function toIso(date: Date | null | undefined): string | null {
  if (!date) {
    return null;
  }
  return date.toISOString();
}

export function toSubmitResponse(batch: PublishBatch, items: PublishBatchItem[]) {
  return {
    id: batch.id,
    clientBatchId: batch.clientBatchId,
    status: batch.status,
    videoCount: batch.videoCount,
    taskCount: batch.taskCount,
    successCount: batch.successCount,
    failureCount: batch.failureCount,
    skippedNonDouyinCount: batch.skippedNonDouyinCount,
    draftId: batch.draftId,
    startedAt: batch.startedAt.toISOString(),
    finishedAt: batch.finishedAt.toISOString(),
    createdAt: batch.createdAt.toISOString(),
    items: items.map(toItemSummary),
  };
}

export function toItemSummary(item: PublishBatchItem) {
  return {
    id: item.id,
    stepKey: item.stepKey,
    status: item.status,
    accountId: item.accountId,
    accountNickname: item.accountNickname,
    videoTitle: item.videoTitle,
    publishedAt: item.publishedAt.toISOString(),
  };
}

export function toItemDetail(item: PublishBatchItem) {
  return {
    id: item.id,
    stepKey: item.stepKey,
    entryClientId: item.entryClientId,
    draftItemClientId: item.draftItemClientId,
    accountId: item.accountId,
    platformId: item.platformId,
    accountNickname: item.accountNickname,
    accountOpenId: item.accountOpenId,
    videoTitle: item.videoTitle,
    videoDescription: item.videoDescription,
    topics: item.topics,
    tags: item.tags,
    videoFileName: item.videoFileName,
    videoLocalPathHash: item.videoLocalPathHash,
    douyinPublishTag: item.douyinPublishTag,
    douyinCartItems: item.douyinCartItems,
    location: item.location,
    scheduleAt: toIso(item.scheduleAt),
    status: item.status,
    errorCode: item.errorCode,
    errorMessage: item.errorMessage,
    platformWorkId: item.platformWorkId,
    platformWorkUrl: item.platformWorkUrl,
    publishedAt: item.publishedAt.toISOString(),
  };
}

export function toDetail(batch: PublishBatch, items: PublishBatchItem[]) {
  return {
    id: batch.id,
    clientBatchId: batch.clientBatchId,
    draftId: batch.draftId,
    status: batch.status,
    platformScope: batch.platformScope,
    publishMethod: batch.publishMethod,
    videoCount: batch.videoCount,
    taskCount: batch.taskCount,
    successCount: batch.successCount,
    failureCount: batch.failureCount,
    skippedNonDouyinCount: batch.skippedNonDouyinCount,
    startedAt: batch.startedAt.toISOString(),
    finishedAt: batch.finishedAt.toISOString(),
    createdAt: batch.createdAt.toISOString(),
    items: items.map(toItemDetail),
  };
}

export function buildSummaryTitle(
  items: PublishBatchItem[],
  videoCount: number,
): string {
  const firstTitle =
    items.find((item) => item.status === 'success')?.videoTitle ??
    items[0]?.videoTitle ??
    '未命名视频';

  if (videoCount <= 1) {
    return firstTitle;
  }

  return `${firstTitle} 等 ${videoCount} 个视频`;
}

export function buildAccountsPreview(items: PublishBatchItem[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    if (!seen.has(item.accountId)) {
      seen.add(item.accountId);
      result.push(item.accountNickname);
    }
  }

  return result;
}

/** 用于幂等比较：将请求体规范化为可比较的 JSON 字符串 */
export function normalizeSubmitPayload(dto: SubmitPublishResultDto): string {
  const normalized = {
    publishSessionKey: dto.publishSessionKey ?? null,
    draftId: dto.draftId ?? null,
    status: dto.status,
    platformScope: dto.platformScope,
    publishMethod: dto.publishMethod,
    videoCount: dto.videoCount,
    taskCount: dto.taskCount,
    successCount: dto.successCount,
    failureCount: dto.failureCount,
    skippedNonDouyinCount: dto.skippedNonDouyinCount ?? 0,
    startedAt: dto.startedAt,
    finishedAt: dto.finishedAt,
    items: [...dto.items]
      .map((item) => ({
        stepKey: item.stepKey,
        entryClientId: item.entryClientId,
        draftItemClientId: item.draftItemClientId ?? null,
        accountId: item.accountId,
        platformId: item.platformId,
        accountNickname: item.accountNickname,
        accountOpenId: item.accountOpenId ?? null,
        videoTitle: item.videoTitle,
        videoDescription: item.videoDescription ?? '',
        topics: item.topics ?? null,
        tags: item.tags ?? null,
        videoFileName: item.videoFileName ?? null,
        videoLocalPathHash: item.videoLocalPathHash ?? null,
        douyinPublishTag: item.douyinPublishTag ?? null,
        douyinCartItems: item.douyinCartItems ?? null,
        location: item.location ?? null,
        scheduleAt: item.scheduleAt ?? null,
        status: item.status,
        errorCode: item.errorCode ?? null,
        errorMessage: item.errorMessage ?? null,
        platformWorkId: item.platformWorkId ?? null,
        platformWorkUrl: item.platformWorkUrl ?? null,
        publishedAt: item.publishedAt,
      }))
      .sort((a, b) => a.stepKey.localeCompare(b.stepKey)),
  };

  return JSON.stringify(normalized);
}

export function batchToNormalizedPayload(
  batch: PublishBatch,
  items: PublishBatchItem[],
): string {
  const normalized = {
    publishSessionKey: batch.publishSessionKey,
    draftId: batch.draftId,
    status: batch.status,
    platformScope: batch.platformScope,
    publishMethod: batch.publishMethod,
    videoCount: batch.videoCount,
    taskCount: batch.taskCount,
    successCount: batch.successCount,
    failureCount: batch.failureCount,
    skippedNonDouyinCount: batch.skippedNonDouyinCount,
    startedAt: batch.startedAt.toISOString(),
    finishedAt: batch.finishedAt.toISOString(),
    items: [...items]
      .map((item) => ({
        stepKey: item.stepKey,
        entryClientId: item.entryClientId,
        draftItemClientId: item.draftItemClientId,
        accountId: item.accountId,
        platformId: item.platformId,
        accountNickname: item.accountNickname,
        accountOpenId: item.accountOpenId,
        videoTitle: item.videoTitle,
        videoDescription: item.videoDescription,
        topics: item.topics,
        tags: item.tags,
        videoFileName: item.videoFileName,
        videoLocalPathHash: item.videoLocalPathHash,
        douyinPublishTag: item.douyinPublishTag,
        douyinCartItems: item.douyinCartItems,
        location: item.location,
        scheduleAt: toIso(item.scheduleAt),
        status: item.status,
        errorCode: item.errorCode,
        errorMessage: item.errorMessage,
        platformWorkId: item.platformWorkId,
        platformWorkUrl: item.platformWorkUrl,
        publishedAt: item.publishedAt.toISOString(),
      }))
      .sort((a, b) => a.stepKey.localeCompare(b.stepKey)),
  };

  return JSON.stringify(normalized);
}
