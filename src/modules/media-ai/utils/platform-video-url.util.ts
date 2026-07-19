import { BadRequestException } from '@nestjs/common';
import { PlatformId } from '../../platform/enums/platform-id.enum';
import {
  PLATFORM_VIDEO_URL_RULES,
  type PlatformVideoUrlRule,
} from '../constants/platform-video-url.constant';

export interface ParsedPlatformVideoUrl {
  normalizedUrl: string;
  downloadUrl: string;
  platformId: PlatformId;
  platformName: string;
}

function resolvePlatformDownloadUrl(
  parsed: URL,
  platformId: PlatformId,
): string {
  if (platformId === PlatformId.DOUYIN) {
    const modalId = parsed.searchParams.get('modal_id');
    if (modalId) {
      return `https://www.douyin.com/video/${modalId}`;
    }
    const noteId =
      parsed.searchParams.get('note_id') ?? parsed.searchParams.get('aweme_id');
    if (noteId) {
      return `https://www.douyin.com/video/${noteId}`;
    }
    const videoMatch = parsed.pathname.match(/\/video\/(\d+)/);
    if (videoMatch) {
      return `https://www.douyin.com/video/${videoMatch[1]}`;
    }
  }

  if (platformId === PlatformId.BILIBILI) {
    const bvidMatch = parsed.pathname.match(/\/video\/(BV[\w]+)/i);
    if (bvidMatch) {
      return `https://www.bilibili.com/video/${bvidMatch[1]}`;
    }
  }

  return parsed.toString();
}

function matchPlatformRule(hostname: string): PlatformVideoUrlRule | undefined {
  const lowerHost = hostname.toLowerCase();
  return PLATFORM_VIDEO_URL_RULES.find((rule) =>
    rule.hostPatterns.some((pattern) => pattern.test(lowerHost)),
  );
}

export function parsePlatformVideoUrl(rawUrl: string): ParsedPlatformVideoUrl {
  const trimmed = rawUrl?.trim();
  if (!trimmed) {
    throw new BadRequestException('请提供视频链接');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    throw new BadRequestException('视频链接格式无效');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new BadRequestException('仅支持 http/https 视频链接');
  }

  const rule = matchPlatformRule(parsed.hostname);
  if (!rule) {
    const supported = PLATFORM_VIDEO_URL_RULES.map((item) => item.name).join('、');
    throw new BadRequestException(
      `暂不支持该平台的视频链接，当前支持：${supported}`,
    );
  }

  parsed.hash = '';
  const normalizedUrl = parsed.toString();
  return {
    normalizedUrl,
    downloadUrl: resolvePlatformDownloadUrl(parsed, rule.platformId),
    platformId: rule.platformId,
    platformName: rule.name,
  };
}

export function assertPlatformVideoUrlMatches(
  url: string,
  expectedPlatformId?: PlatformId,
): ParsedPlatformVideoUrl {
  const parsed = parsePlatformVideoUrl(url);
  if (expectedPlatformId && parsed.platformId !== expectedPlatformId) {
    throw new BadRequestException(
      `链接属于${parsed.platformName}，与指定的 platformId=${expectedPlatformId} 不一致`,
    );
  }
  return parsed;
}
