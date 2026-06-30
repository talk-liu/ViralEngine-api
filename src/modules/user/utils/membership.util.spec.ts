import { isMembershipExpired } from './membership.util';

describe('isMembershipExpired', () => {
  it('管理员永不过期', () => {
    expect(
      isMembershipExpired({
        isAdmin: true,
        membershipExpiresAt: new Date('2020-01-01T00:00:00.000Z'),
      }),
    ).toBe(false);
  });

  it('无到期时间视为未过期', () => {
    expect(
      isMembershipExpired({
        isAdmin: false,
        membershipExpiresAt: null,
      }),
    ).toBe(false);
  });

  it('到期时间已过视为过期', () => {
    expect(
      isMembershipExpired({
        isAdmin: false,
        membershipExpiresAt: new Date('2020-01-01T00:00:00.000Z'),
      }),
    ).toBe(true);
  });
});
