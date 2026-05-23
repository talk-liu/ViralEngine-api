import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

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
}
