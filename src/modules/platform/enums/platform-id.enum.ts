export enum PlatformId {
  DOUYIN = 'douyin',
  KUAISHOU = 'kuaishou',
  BILIBILI = 'bilibili',
  XIAOHONGSHU = 'xiaohongshu',
  WEIXIN_CHANNELS = 'weixin_channels',
  TIKTOK = 'tiktok',
}

export const OAUTH_PLATFORMS = new Set<PlatformId>([
  PlatformId.DOUYIN,
  PlatformId.KUAISHOU,
]);
