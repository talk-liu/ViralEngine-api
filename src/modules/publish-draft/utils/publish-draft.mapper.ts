import { BadRequestException } from '@nestjs/common';
import { PlatformId } from '../../platform/enums/platform-id.enum';
import { PublishDraftAsset } from '../entities/publish-draft-asset.entity';
import { PublishDraft } from '../entities/publish-draft.entity';
import type {
  PublishDraftPayload,
  PublishDraftPayloadItem,
} from '../types/publish-draft-payload.type';

const VIDEO_LOCAL_PATH_MAX_LENGTH = 4096;
const CONTROL_CHAR_PATTERN = /[\x00-\x1f\x7f]/;

export function normalizeVideoLocalPath(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > VIDEO_LOCAL_PATH_MAX_LENGTH) {
    throw new BadRequestException(
      `videoLocalPath 长度不能超过 ${VIDEO_LOCAL_PATH_MAX_LENGTH}`,
    );
  }
  if (CONTROL_CHAR_PATTERN.test(trimmed)) {
    throw new BadRequestException('videoLocalPath 包含非法控制字符');
  }
  return trimmed;
}

export function hasDraftVideo(
  draft: Pick<PublishDraft, 'videoAssetId' | 'videoLocalPath'>,
): boolean {
  if (draft.videoAssetId) {
    return true;
  }
  const path = draft.videoLocalPath?.trim();
  return Boolean(path);
}

export function resolveListTitle(
  payload: PublishDraftPayload,
  videoFileName: string | null | undefined,
): string {
  const title = payload.title?.trim();
  if (title) {
    return title;
  }
  const fileName = videoFileName?.trim();
  if (fileName) {
    return fileName;
  }
  return '未命名草稿';
}

export function toIso(date: Date): string {
  return date.toISOString();
}

export function buildPlatformCoverUrls(
  assets: PublishDraftAsset[],
  signUrl: (asset: PublishDraftAsset) => string | null,
): Partial<Record<PlatformId, string>> {
  const latestByPlatform = new Map<string, PublishDraftAsset>();
  for (const asset of assets) {
    if (!asset.platformId) {
      continue;
    }
    const prev = latestByPlatform.get(asset.platformId);
    if (!prev || asset.createdAt > prev.createdAt) {
      latestByPlatform.set(asset.platformId, asset);
    }
  }

  const urls: Partial<Record<PlatformId, string>> = {};
  for (const [platformId, asset] of latestByPlatform) {
    const url = signUrl(asset);
    if (url) {
      urls[platformId as PlatformId] = url;
    }
  }
  return urls;
}

export function pickCoverPreviewAsset(
  coverAssets: PublishDraftAsset[],
): PublishDraftAsset | undefined {
  if (coverAssets.length === 0) {
    return undefined;
  }
  return coverAssets.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )[0];
}

export function normalizePlatformOverrides(
  overrides: PublishDraftPayload['platformOverrides'] | undefined,
): PublishDraftPayload['platformOverrides'] {
  const platformOverrides: PublishDraftPayload['platformOverrides'] = {};
  for (const [platformId, override] of Object.entries(overrides ?? {})) {
    if (!override) {
      continue;
    }
    platformOverrides[platformId as keyof typeof platformOverrides] = {
      ...override,
      cartItems: override.cartItems ?? [],
    };
  }
  return platformOverrides;
}

function normalizePayloadItem(
  item: PublishDraftPayloadItem,
): PublishDraftPayloadItem {
  return {
    clientId: item.clientId?.trim() ?? '',
    videoFileName: item.videoFileName?.trim() || null,
    videoLocalPath: normalizeVideoLocalPath(item.videoLocalPath),
    title: item.title ?? '',
    description: item.description ?? '',
    topics: item.topics ?? [],
    tags: item.tags ?? [],
    scheduleAt: item.scheduleAt ?? '',
    showSchedule: item.showSchedule ?? false,
    platformOverrides: normalizePlatformOverrides(item.platformOverrides),
    accountIds: [...new Set(item.accountIds ?? [])],
  };
}

export function normalizePayload(
  payload: PublishDraftPayload,
): PublishDraftPayload {
  const accountIds = [...new Set(payload.accountIds ?? [])];
  const normalized: PublishDraftPayload = {
    title: payload.title ?? '',
    description: payload.description ?? '',
    topics: payload.topics ?? [],
    tags: payload.tags ?? [],
    scheduleAt: payload.scheduleAt ?? '',
    showSchedule: payload.showSchedule ?? false,
    platformOverrides: normalizePlatformOverrides(payload.platformOverrides),
    accountIds,
  };

  if (Array.isArray(payload.items) && payload.items.length > 0) {
    normalized.items = payload.items.map(normalizePayloadItem);
  }

  return normalized;
}
