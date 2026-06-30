import { User } from '../entities/user.entity';

export function parseMembershipExpiresAt(
  value: Date | string | null | undefined,
): Date | null {
  if (value == null || value === '') {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isMembershipExpired(
  user: Pick<User, 'isAdmin' | 'membershipExpiresAt'>,
): boolean {
  if (user.isAdmin) {
    return false;
  }

  const expiresAt = parseMembershipExpiresAt(
    user.membershipExpiresAt as Date | string | null,
  );
  if (!expiresAt) {
    return true;
  }

  return expiresAt.getTime() <= Date.now();
}
