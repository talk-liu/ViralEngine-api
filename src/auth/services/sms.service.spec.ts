import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import { SmsService } from './sms.service';

describe('SmsService', () => {
  let service: SmsService;
  let redis: {
    exists: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
    multi: jest.Mock;
  };

  beforeEach(async () => {
    const exec = jest.fn().mockResolvedValue([]);
    redis = {
      exists: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      multi: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        exec,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        { provide: REDIS_CLIENT, useValue: redis },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, number> = {
                'sms.cooldownTtl': 60,
                'sms.codeTtl': 300,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get(SmsService);
  });

  describe('sendRegisterCode', () => {
    it('冷却期内应拒绝发送', async () => {
      redis.exists.mockResolvedValue(1);
      await expect(service.sendRegisterCode('13800000000')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('应写入验证码并返回 code', async () => {
      redis.exists.mockResolvedValue(0);
      const code = await service.sendRegisterCode('13800000000');
      expect(code).toMatch(/^\d{6}$/);
      expect(redis.multi).toHaveBeenCalled();
    });
  });

  describe('verifyRegisterCode', () => {
    it('验证码错误应抛出异常', async () => {
      redis.get.mockResolvedValue('123456');
      await expect(
        service.verifyRegisterCode('13800000000', '000000'),
      ).rejects.toThrow(BadRequestException);
    });

    it('验证成功应删除验证码', async () => {
      redis.get.mockResolvedValue('123456');
      await service.verifyRegisterCode('13800000000', '123456');
      expect(redis.del).toHaveBeenCalled();
    });
  });
});
