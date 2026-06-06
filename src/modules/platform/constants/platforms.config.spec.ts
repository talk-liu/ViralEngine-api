import { PlatformId } from '../enums/platform-id.enum';
import { getPlatformMeta, getPlatformName } from './platforms.config';

describe('platforms.config', () => {
  it('getPlatformMeta 应返回已知平台元数据', () => {
    const meta = getPlatformMeta(PlatformId.DOUYIN);
    expect(meta?.name).toBe('抖音');
    expect(meta?.enabled).toBe(true);
  });

  it('getPlatformMeta 对未知平台应返回 undefined', () => {
    expect(getPlatformMeta('unknown' as PlatformId)).toBeUndefined();
  });

  it('getPlatformName 应返回平台中文名', () => {
    expect(getPlatformName(PlatformId.KUAISHOU)).toBe('快手');
  });

  it('getPlatformName 对未知平台应回退为 platformId', () => {
    expect(getPlatformName('unknown' as PlatformId)).toBe('unknown');
  });
});
