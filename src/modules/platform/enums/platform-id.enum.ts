export enum PlatformId {
  DOUYIN = 'douyin',
  KUAISHOU = 'kuaishou',
  BILIBILI = 'bilibili',
  XIAOHONGSHU = 'xiaohongshu',
  WEIXIN_CHANNELS = 'weixin_channels',
  TIKTOK = 'tiktok',
  BOSS = 'boss',
  TAOBAO = 'taobao',
}

export const OAUTH_PLATFORMS = new Set<PlatformId>([
  PlatformId.DOUYIN,
  PlatformId.KUAISHOU,
]);
