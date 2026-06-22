import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import { SmsService } from './sms.service';
import { TencentSmsProvider } from './sms/tencent-sms.provider';

describe('SmsService', () => {
  let service: SmsService;
  let tencentSms: jest.Mocked<Pick<TencentSmsProvider, 'isConfigured' | 'sendRegisterCode'>>;
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
    tencentSms = {
      isConfigured: jest.fn().mockReturnValue(false),
      sendRegisterCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: TencentSmsProvider, useValue: tencentSms },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, number | string> = {
                'sms.cooldownTtl': 60,
                'sms.codeTtl': 300,
                nodeEnv: 'development',
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
      expect(tencentSms.sendRegisterCode).not.toHaveBeenCalled();
    });

    it('开发环境已配置腾讯云时应调用发送', async () => {
      redis.exists.mockResolvedValue(0);
      tencentSms.isConfigured.mockReturnValue(true);

      await service.sendRegisterCode('13800000000');

      expect(tencentSms.sendRegisterCode).toHaveBeenCalledWith(
        '13800000000',
        expect.stringMatching(/^\d{6}$/),
      );
    });

    it('生产环境未配置腾讯云应拒绝发送', async () => {
      const configService = {
        get: jest.fn((key: string) => {
          const config: Record<string, number | string> = {
            'sms.cooldownTtl': 60,
            'sms.codeTtl': 300,
            nodeEnv: 'production',
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SmsService,
          { provide: REDIS_CLIENT, useValue: redis },
          { provide: TencentSmsProvider, useValue: tencentSms },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      const prodService = module.get(SmsService);
      redis.exists.mockResolvedValue(0);
      tencentSms.isConfigured.mockReturnValue(false);

      await expect(prodService.sendRegisterCode('13800000000')).rejects.toThrow(
        BadRequestException,
      );
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
