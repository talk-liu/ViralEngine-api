import { PlatformId } from '../../platform/enums/platform-id.enum';
import { PublishDraftAsset } from '../entities/publish-draft-asset.entity';
import { PublishDraft } from '../entities/publish-draft.entity';
import type { PublishDraftPayload } from '../types/publish-draft-payload.type';

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

export function normalizePayload(
  payload: PublishDraftPayload,
): PublishDraftPayload {
  const platformOverrides: PublishDraftPayload['platformOverrides'] = {};
  for (const [platformId, override] of Object.entries(
    payload.platformOverrides ?? {},
  )) {
    if (!override) {
      continue;
    }
    platformOverrides[platformId as keyof typeof platformOverrides] = {
      ...override,
      cartItems: override.cartItems ?? [],
    };
  }

  return {
    title: payload.title ?? '',
    description: payload.description ?? '',
    topics: payload.topics ?? [],
    tags: payload.tags ?? [],
    scheduleAt: payload.scheduleAt ?? '',
    showSchedule: payload.showSchedule ?? false,
    platformOverrides,
  };
}
