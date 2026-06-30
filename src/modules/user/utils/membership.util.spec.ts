import { isMembershipExpired, parseMembershipExpiresAt } from './membership.util';

describe('isMembershipExpired', () => {
  it('管理员永不过期', () => {
    expect(
      isMembershipExpired({
        isAdmin: true,
        membershipExpiresAt: new Date('2020-01-01T00:00:00.000Z'),
      }),
    ).toBe(false);
  });

  it('普通用户无到期时间视为已过期', () => {
    expect(
      isMembershipExpired({
        isAdmin: false,
        membershipExpiresAt: null,
      }),
    ).toBe(true);
  });

  it('到期时间已过视为过期', () => {
    expect(
      isMembershipExpired({
        isAdmin: false,
        membershipExpiresAt: new Date('2020-01-01T00:00:00.000Z'),
      }),
    ).toBe(true);
  });

  it('MySQL 字符串格式的到期时间也能正确判断', () => {
    expect(
      isMembershipExpired({
        isAdmin: false,
        membershipExpiresAt: '2020-01-01 00:00:00' as unknown as Date,
      }),
    ).toBe(true);
  });
});

describe('parseMembershipExpiresAt', () => {
  it('应解析 ISO 字符串', () => {
    const parsed = parseMembershipExpiresAt('2020-01-01T00:00:00.000Z');
    expect(parsed?.toISOString()).toBe('2020-01-01T00:00:00.000Z');
  });
});
