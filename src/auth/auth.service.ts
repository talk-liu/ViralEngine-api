import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PlatformService } from '../modules/platform/services/platform.service';
import { PublishResultService } from '../modules/publish-result/services/publish-result.service';
import { User } from '../modules/user/entities/user.entity';
import { UserService } from '../modules/user/user.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CaptchaService } from './services/captcha.service';
import { SmsService } from './services/sms.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly smsService: SmsService,
    private readonly captchaService: CaptchaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService,
    private readonly publishResultService: PublishResultService,
  ) {}

  async getCaptcha() {
    return this.captchaService.generate();
  }

  async sendRegisterSmsCode(phone: string) {
    if (await this.userService.existsByPhone(phone)) {
      throw new ConflictException('该手机号已注册');
    }

    const code = await this.smsService.sendRegisterCode(phone);
    const isDev = this.configService.get<string>('nodeEnv') !== 'production';

    return {
      message: '验证码已发送',
      ...(isDev ? { debugCode: code } : {}),
    };
  }

  async sendForgotPasswordSmsCode(phone: string) {
    if (!(await this.userService.existsByPhone(phone))) {
      throw new BadRequestException('该手机号未注册');
    }

    const code = await this.smsService.sendResetPasswordCode(phone);
    const isDev = this.configService.get<string>('nodeEnv') !== 'production';

    return {
      message: '验证码已发送',
      ...(isDev ? { debugCode: code } : {}),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userService.findByPhone(dto.phone);
    if (!user) {
      throw new BadRequestException('该手机号未注册');
    }

    await this.smsService.verifyResetPasswordCode(dto.phone, dto.smsCode);

    const passwordHash = await argon2.hash(dto.password);
    await this.userService.updatePassword(user.id, passwordHash);

    return { message: '密码重置成功' };
  }

  async register(dto: RegisterDto) {
    if (await this.userService.existsByPhone(dto.phone)) {
      throw new ConflictException('该手机号已注册');
    }

    await this.smsService.verifyRegisterCode(dto.phone, dto.smsCode);

    let referrerId: string | null = null;
    if (dto.referralCode) {
      const referrer = await this.userService.findByReferralCode(dto.referralCode);
      if (!referrer) {
        throw new ConflictException('推荐码无效');
      }
      referrerId = referrer.id;
    }

    const passwordHash = await argon2.hash(dto.password);
    const referralCode = await this.generateUniqueReferralCode();

    const user = await this.userService.create({
      phone: dto.phone,
      passwordHash,
      referralCode,
      referrerId,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    await this.captchaService.verify(dto.captchaId, dto.captchaCode);

    const user = await this.userService.findByPhone(dto.phone);
    if (!user) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    return this.buildAuthResponse(user);
  }

  async getProfile(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('用户不存在或登录已失效');
    }

    const [boundAccountCount, publishResultCount] = await Promise.all([
      this.platformService.countUserAccounts(userId),
      this.publishResultService.countUserBatches(userId),
    ]);

    return {
      id: user.id,
      phone: user.phone,
      referralCode: user.referralCode,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      boundAccountCount,
      publishResultCount,
    };
  }

  private async generateUniqueReferralCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = randomBytes(4).toString('hex').toUpperCase();
      const exists = await this.userService.existsByReferralCode(code);
      if (!exists) {
        return code;
      }
    }

    throw new ConflictException('推荐码生成失败，请重试');
  }

  private buildAuthResponse(user: User) {
    const payload = { sub: user.id, phone: user.phone };

    return {
      accessToken: this.jwtService.sign(payload),
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('jwt.expiresIn') ?? '7d',
      user: {
        id: user.id,
        phone: user.phone,
        referralCode: user.referralCode,
        isAdmin: user.isAdmin,
      },
    };
  }
}
