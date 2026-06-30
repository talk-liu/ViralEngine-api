import { User } from '../../user/entities/user.entity';
import { isMembershipExpired } from '../../user/utils/membership.util';
import {
  AdminUserCreatedDto,
  AdminUserListItemDto,
} from '../dto/admin-user-response.dto';

function toIsoString(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function toAdminUserListItem(user: User): AdminUserListItemDto {
  return {
    id: user.id,
    phone: user.phone,
    referralCode: user.referralCode,
    isAdmin: user.isAdmin,
    isDisabled: user.isDisabled,
    membershipExpiresAt: toIsoString(user.membershipExpiresAt),
    isExpired: isMembershipExpired(user),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toAdminUserCreatedDto(
  user: User,
  initialPassword: string,
): AdminUserCreatedDto {
  return {
    ...toAdminUserListItem(user),
    initialPassword,
  };
}
