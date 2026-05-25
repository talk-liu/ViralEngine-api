import { PlatformId } from '../enums/platform-id.enum';

export interface PlatformMeta {
  id: PlatformId;
  name: string;
  icon: string;
  description: string;
  enabled: boolean;
}

export const PLATFORM_REGISTRY: PlatformMeta[] = [
  {
    id: PlatformId.DOUYIN,
    name: '抖音',
    icon: 'douyin',
    description: '字节跳动 · 短视频',
    enabled: true,
  },
  {
    id: PlatformId.KUAISHOU,
    name: '快手',
    icon: 'kuaishou',
    description: '快手 · 短视频',
    enabled: true,
  },
  {
    id: PlatformId.BILIBILI,
    name: '哔哩哔哩',
    icon: 'bilibili',
    description: 'B站 · 视频社区',
    enabled: false,
  },
  {
    id: PlatformId.XIAOHONGSHU,
    name: '小红书',
    icon: 'xiaohongshu',
    description: '生活方式社区',
    enabled: false,
  },
  {
    id: PlatformId.WEIXIN_CHANNELS,
    name: '视频号',
    icon: 'weixin_channels',
    description: '微信 · 视频号',
    enabled: false,
  },
  {
    id: PlatformId.TIKTOK,
    name: 'TikTok',
    icon: 'tiktok',
    description: 'TikTok · 国际版',
    enabled: false,
  },
];

export function getPlatformMeta(platformId: PlatformId): PlatformMeta | undefined {
  return PLATFORM_REGISTRY.find((p) => p.id === platformId);
}

export function getPlatformName(platformId: PlatformId): string {
  return getPlatformMeta(platformId)?.name ?? platformId;
}
