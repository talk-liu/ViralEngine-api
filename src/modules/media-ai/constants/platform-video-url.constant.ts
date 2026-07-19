import { PlatformId } from '../../platform/enums/platform-id.enum';

export interface PlatformVideoUrlRule {
  platformId: PlatformId;
  /** 用于展示的平台名称 */
  name: string;
  /** 匹配分享链接的 host 片段（小写） */
  hostPatterns: RegExp[];
}

/** 支持通过链接导入并做字幕识别的平台 */
export const PLATFORM_VIDEO_URL_RULES: PlatformVideoUrlRule[] = [
  {
    platformId: PlatformId.DOUYIN,
    name: '抖音',
    hostPatterns: [
      /(^|\.)douyin\.com$/i,
      /(^|\.)iesdouyin\.com$/i,
    ],
  },
  {
    platformId: PlatformId.KUAISHOU,
    name: '快手',
    hostPatterns: [
      /(^|\.)kuaishou\.com$/i,
      /(^|\.)chenzhongtech\.com$/i,
      /(^|\.)gifshow\.com$/i,
    ],
  },
  {
    platformId: PlatformId.XIAOHONGSHU,
    name: '小红书',
    hostPatterns: [
      /(^|\.)xiaohongshu\.com$/i,
      /(^|\.)xhslink\.com$/i,
    ],
  },
  {
    platformId: PlatformId.WEIXIN_CHANNELS,
    name: '视频号',
    hostPatterns: [
      /(^|\.)channels\.weixin\.qq\.com$/i,
      /(^|\.)weixin\.qq\.com$/i,
    ],
  },
  {
    platformId: PlatformId.BILIBILI,
    name: '哔哩哔哩',
    hostPatterns: [
      /(^|\.)bilibili\.com$/i,
      /(^|\.)b23\.tv$/i,
    ],
  },
  {
    platformId: PlatformId.TIKTOK,
    name: 'TikTok',
    hostPatterns: [
      /(^|\.)tiktok\.com$/i,
      /(^|\.)tiktokv\.com$/i,
    ],
  },
];

export const SUPPORTED_PLATFORM_VIDEO_URL_IDS = PLATFORM_VIDEO_URL_RULES.map(
  (rule) => rule.platformId,
);
