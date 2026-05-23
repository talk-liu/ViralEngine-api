import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { randomUUID } from 'crypto';
import * as svgCaptcha from 'svg-captcha';
import { REDIS_CLIENT } from '../../redis/redis.constants';

@Injectable()
export class CaptchaService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  private captchaKey(captchaId: string) {
    return `captcha:${captchaId}`;
  }

  async generate() {
    const captcha = svgCaptcha.create({
      size: 4,
      ignoreChars: '0oO1ilI',
      noise: 3,
      color: true,
      background: '#f5f5f5',
      width: 120,
      height: 40,
    });

    const captchaId = randomUUID();
    const ttl = this.configService.get<number>('captcha.ttl') ?? 300;

    await this.redis.set(
      this.captchaKey(captchaId),
      captcha.text.toLowerCase(),
      'EX',
      ttl,
    );

    const svgBase64 = Buffer.from(captcha.data).toString('base64');

    return {
      captchaId,
      image: `data:image/svg+xml;base64,${svgBase64}`,
    };
  }

  async verify(captchaId: string, captchaCode: string): Promise<void> {
    const key = this.captchaKey(captchaId);
    const stored = await this.redis.get(key);

    if (!stored) {
      throw new BadRequestException('图片验证码已过期，请刷新后重试');
    }

    await this.redis.del(key);

    if (stored !== captchaCode.toLowerCase()) {
      throw new BadRequestException('图片验证码错误');
    }
  }
}
