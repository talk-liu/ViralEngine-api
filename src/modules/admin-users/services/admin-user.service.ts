import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { Repository } from 'typeorm';
import { UserService } from '../../user/user.service';
import { generateRandomPassword } from '../../user/utils/random-password.util';
import { CreateAdminUserDto } from '../dto/create-admin-user.dto';
import { ListAdminUsersQueryDto } from '../dto/list-admin-users-query.dto';
import { UpdateAdminUserDto } from '../dto/update-admin-user.dto';
import {
  toAdminUserCreatedDto,
  toAdminUserListItem,
} from '../utils/admin-user.mapper';

@Injectable()
export class AdminUserService {
  constructor(private readonly userService: UserService) {}

  list(query: ListAdminUsersQueryDto) {
    return this.userService.listForAdmin(query).then(({ items, total, page, pageSize }) => ({
      items: items.map(toAdminUserListItem),
      total,
      page,
      pageSize,
    }));
  }

  async getById(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return toAdminUserListItem(user);
  }

  async create(dto: CreateAdminUserDto) {
    if (await this.userService.existsByPhone(dto.phone)) {
      throw new ConflictException('该手机号已注册');
    }

    const initialPassword = generateRandomPassword();
    const passwordHash = await argon2.hash(initialPassword);
    const referralCode = await this.userService.generateUniqueReferralCode();

    const user = await this.userService.create({
      phone: dto.phone,
      passwordHash,
      referralCode,
      referrerId: null,
      membershipExpiresAt: new Date(dto.membershipExpiresAt),
      isDisabled: false,
    });

    return toAdminUserCreatedDto(user, initialPassword);
  }

  async update(userId: string, dto: UpdateAdminUserDto) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (user.isAdmin) {
      throw new ConflictException('不能编辑管理员账号');
    }

    const patch: Partial<{
      membershipExpiresAt: Date;
      isDisabled: boolean;
    }> = {};

    if (dto.membershipExpiresAt !== undefined) {
      patch.membershipExpiresAt = new Date(dto.membershipExpiresAt);
    }
    if (dto.isDisabled !== undefined) {
      patch.isDisabled = dto.isDisabled;
    }

    if (Object.keys(patch).length === 0) {
      return toAdminUserListItem(user);
    }

    await this.userService.update(userId, patch);
    const updated = await this.userService.findById(userId);
    return toAdminUserListItem(updated!);
  }

  async resetPassword(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (user.isAdmin) {
      throw new ConflictException('不能重置管理员密码');
    }

    const newPassword = generateRandomPassword();
    const passwordHash = await argon2.hash(newPassword);
    await this.userService.updatePassword(userId, passwordHash);
    await this.userService.incrementTokenVersion(userId);

    return { id: userId, newPassword };
  }
}
