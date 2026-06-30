import { UnauthorizedException } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { isMembershipExpired } from './membership.util';

export function assertUserCanAccess(
  user: Pick<User, 'isAdmin' | 'membershipExpiresAt' | 'isDisabled'>,
): void {
  if (user.isDisabled) {
    throw new UnauthorizedException('账号已禁用');
  }
  if (isMembershipExpired(user)) {
    throw new UnauthorizedException('会员已到期，请联系管理员续费');
  }
}
