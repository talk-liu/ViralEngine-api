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

  private codeKey(phone: string) {
    return `sms:register:${phone}`;
  }

  private cooldownKey(phone: string) {
    return `sms:register:cooldown:${phone}`;
  }

  async sendRegisterCode(phone: string): Promise<string> {
    const cooldownTtl = this.configService.get<number>('sms.cooldownTtl') ?? 60;
    const codeTtl = this.configService.get<number>('sms.codeTtl') ?? 300;
    const isProd = this.configService.get<string>('nodeEnv') === 'production';

    const onCooldown = await this.redis.exists(this.cooldownKey(phone));
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
      this.logger.log(`[dev] 注册验证码 [${phone}]: ${code}`);
    }

    await this.redis
      .multi()
      .set(this.codeKey(phone), code, 'EX', codeTtl)
      .set(this.cooldownKey(phone), '1', 'EX', cooldownTtl)
      .exec();

    return code;
  }

  async verifyRegisterCode(phone: string, code: string): Promise<void> {
    const stored = await this.redis.get(this.codeKey(phone));

    if (!stored || stored !== code) {
      throw new BadRequestException('短信验证码错误或已过期');
    }

    await this.redis.del(this.codeKey(phone));
  }
}
