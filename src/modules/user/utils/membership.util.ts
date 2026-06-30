import { User } from '../entities/user.entity';

export function isMembershipExpired(user: Pick<User, 'isAdmin' | 'membershipExpiresAt'>): boolean {
  if (user.isAdmin) {
    return false;
  }
  if (!user.membershipExpiresAt) {
    return false;
  }
  return user.membershipExpiresAt <= new Date();
}
