import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import { CaptchaService } from './captcha.service';

jest.mock('svg-captcha', () => ({
  create: jest.fn(() => ({
    text: 'Ab3d',
    data: '<svg></svg>',
  })),
}));

describe('CaptchaService', () => {
  let service: CaptchaService;
  let redis: { set: jest.Mock; get: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    redis = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaptchaService,
        { provide: REDIS_CLIENT, useValue: redis },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(300) },
        },
      ],
    }).compile();

    service = module.get(CaptchaService);
  });

  describe('generate', () => {
    it('应返回 captchaId 与 base64 图片', async () => {
      const result = await service.generate();
      expect(result.captchaId).toBeDefined();
      expect(result.image).toMatch(/^data:image\/svg\+xml;base64,/);
      expect(redis.set).toHaveBeenCalled();
    });
  });

  describe('verify', () => {
    it('过期验证码应抛出异常', async () => {
      redis.get.mockResolvedValue(null);
      await expect(service.verify('id', 'abcd')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('错误验证码应抛出异常', async () => {
      redis.get.mockResolvedValue('abcd');
      await expect(service.verify('id', 'wrong')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('正确验证码应通过（大小写不敏感）', async () => {
      redis.get.mockResolvedValue('ab3d');
      await expect(service.verify('id', 'AB3D')).resolves.toBeUndefined();
      expect(redis.del).toHaveBeenCalled();
    });
  });
});
