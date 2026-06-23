import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { randomInt } from 'crypto';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import { TencentSmsProvider } from './sms/tencent-sms.provider';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly tencentSms: TencentSmsProvider,
  ) {}

  private registerCodeKey(phone: string) {
    return `sms:register:${phone}`;
  }

  private registerCooldownKey(phone: string) {
    return `sms:register:cooldown:${phone}`;
  }

  private resetPasswordCodeKey(phone: string) {
    return `sms:reset-password:${phone}`;
  }

  private resetPasswordCooldownKey(phone: string) {
    return `sms:reset-password:cooldown:${phone}`;
  }

  async sendRegisterCode(phone: string): Promise<string> {
    return this.sendCode(
      phone,
      this.registerCodeKey(phone),
      this.registerCooldownKey(phone),
      '注册',
    );
  }

  async verifyRegisterCode(phone: string, code: string): Promise<void> {
    return this.verifyCode(phone, code, this.registerCodeKey(phone));
  }

  async sendResetPasswordCode(phone: string): Promise<string> {
    return this.sendCode(
      phone,
      this.resetPasswordCodeKey(phone),
      this.resetPasswordCooldownKey(phone),
      '重置密码',
    );
  }

  async verifyResetPasswordCode(phone: string, code: string): Promise<void> {
    return this.verifyCode(phone, code, this.resetPasswordCodeKey(phone));
  }

  private async sendCode(
    phone: string,
    codeKey: string,
    cooldownKey: string,
    purpose: string,
  ): Promise<string> {
    const cooldownTtl = this.configService.get<number>('sms.cooldownTtl') ?? 60;
    const codeTtl = this.configService.get<number>('sms.codeTtl') ?? 300;
    const isProd = this.configService.get<string>('nodeEnv') === 'production';

    const onCooldown = await this.redis.exists(cooldownKey);
    if (onCooldown) {
      throw new BadRequestException('发送过于频繁，请稍后再试');
    }

    const code = randomInt(100000, 999999).toString();

    if (isProd) {
      if (!this.tencentSms.isConfigured()) {
        throw new BadRequestException('短信服务未配置');
      }
      try {
        await this.tencentSms.sendRegisterCode(phone, code);
      } catch {
        throw new BadRequestException('短信发送失败，请稍后重试');
      }
    } else if (this.tencentSms.isConfigured()) {
      try {
        await this.tencentSms.sendRegisterCode(phone, code);
      } catch {
        throw new BadRequestException('短信发送失败，请稍后重试');
      }
    } else {
      this.logger.log(`[dev] ${purpose}验证码 [${phone}]: ${code}`);
    }

    await this.redis
      .multi()
      .set(codeKey, code, 'EX', codeTtl)
      .set(cooldownKey, '1', 'EX', cooldownTtl)
      .exec();

    return code;
  }

  private async verifyCode(
    phone: string,
    code: string,
    codeKey: string,
  ): Promise<void> {
    const stored = await this.redis.get(codeKey);

    if (!stored || stored !== code) {
      throw new BadRequestException('短信验证码错误或已过期');
    }

    await this.redis.del(codeKey);
  }
}
