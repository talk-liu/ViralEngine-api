import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

export interface ListUsersQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  expired?: boolean;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  findById(id: string) {
    return this.userRepository.findOne({ where: { id } });
  }

  findByPhone(phone: string) {
    return this.userRepository.findOne({ where: { phone } });
  }

  findByReferralCode(referralCode: string) {
    return this.userRepository.findOne({
      where: { referralCode: referralCode.toUpperCase() },
    });
  }

  existsByPhone(phone: string) {
    return this.userRepository.exists({ where: { phone } });
  }

  existsByReferralCode(referralCode: string) {
    return this.userRepository.exists({
      where: { referralCode: referralCode.toUpperCase() },
    });
  }

  create(data: Partial<User>) {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  update(userId: string, data: Partial<User>) {
    return this.userRepository.update(userId, data);
  }

  updatePassword(userId: string, passwordHash: string) {
    return this.userRepository.update(userId, { passwordHash });
  }

  async incrementTokenVersion(userId: string): Promise<number> {
    await this.userRepository.increment({ id: userId }, 'tokenVersion', 1);
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { tokenVersion: true },
    });
    return user!.tokenVersion;
  }

  async generateUniqueReferralCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = randomBytes(4).toString('hex').toUpperCase();
      const exists = await this.existsByReferralCode(code);
      if (!exists) {
        return code;
      }
    }

    throw new ConflictException('推荐码生成失败，请重试');
  }

  async listForAdmin(query: ListUsersQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const now = new Date();

    const qb = this.userRepository.createQueryBuilder('user');

    if (query.keyword) {
      qb.andWhere('user.phone LIKE :keyword', {
        keyword: `%${query.keyword}%`,
      });
    }

    if (query.expired === true) {
      qb.andWhere('user.isAdmin = :isAdmin', { isAdmin: false }).andWhere(
        '(user.membershipExpiresAt IS NULL OR user.membershipExpiresAt <= :now)',
        { now },
      );
    } else if (query.expired === false) {
      qb.andWhere(
        'user.isAdmin = :isAdmin OR (user.membershipExpiresAt IS NOT NULL AND user.membershipExpiresAt > :now)',
        { isAdmin: true, now },
      );
    }

    qb.orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, pageSize };
  }
}
