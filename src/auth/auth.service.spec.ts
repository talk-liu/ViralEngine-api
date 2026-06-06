import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { User } from '../modules/user/entities/user.entity';
import { UserService } from '../modules/user/user.service';
import { AuthService } from './auth.service';
import { CaptchaService } from './services/captcha.service';
import { SmsService } from './services/sms.service';

jest.mock('argon2');

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<
    Pick<
      UserService,
      | 'existsByPhone'
      | 'findByPhone'
      | 'findById'
      | 'findByReferralCode'
      | 'existsByReferralCode'
      | 'create'
    >
  >;
  let smsService: jest.Mocked<Pick<SmsService, 'sendRegisterCode' | 'verifyRegisterCode'>>;
  let captchaService: jest.Mocked<Pick<CaptchaService, 'generate' | 'verify'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;

  const user: User = {
    id: 'user-1',
    phone: '13800000000',
    passwordHash: 'hash',
    referralCode: 'ABCD1234',
    referrerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    referrer: null,
    referrals: [],
  };

  beforeEach(async () => {
    userService = {
      existsByPhone: jest.fn(),
      findByPhone: jest.fn(),
      findById: jest.fn(),
      findByReferralCode: jest.fn(),
      existsByReferralCode: jest.fn(),
      create: jest.fn(),
    };
    smsService = {
      sendRegisterCode: jest.fn().mockResolvedValue('123456'),
      verifyRegisterCode: jest.fn(),
    };
    captchaService = {
      generate: jest.fn().mockResolvedValue({ captchaId: 'c1', image: 'img' }),
      verify: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue('token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: SmsService, useValue: smsService },
        { provide: CaptchaService, useValue: captchaService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                nodeEnv: 'development',
                'jwt.expiresIn': '7d',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('sendRegisterSmsCode', () => {
    it('已注册手机号应抛出 ConflictException', async () => {
      userService.existsByPhone.mockResolvedValue(true);
      await expect(service.sendRegisterSmsCode('13800000000')).rejects.toThrow(
        ConflictException,
      );
    });

    it('开发环境应返回 debugCode', async () => {
      userService.existsByPhone.mockResolvedValue(false);
      const result = await service.sendRegisterSmsCode('13800000000');
      expect(result.debugCode).toBe('123456');
    });
  });

  describe('register', () => {
    it('应完成注册并返回 token', async () => {
      userService.existsByPhone.mockResolvedValue(false);
      userService.existsByReferralCode.mockResolvedValue(false);
      userService.create.mockResolvedValue(user);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed');

      const result = await service.register({
        phone: '13800000000',
        password: 'Pass1234!',
        confirmPassword: 'Pass1234!',
        smsCode: '123456',
      });

      expect(result.accessToken).toBe('token');
      expect(smsService.verifyRegisterCode).toHaveBeenCalled();
    });

    it('无效推荐码应抛出 ConflictException', async () => {
      userService.existsByPhone.mockResolvedValue(false);
      userService.findByReferralCode.mockResolvedValue(null);

      await expect(
        service.register({
          phone: '13800000000',
          password: 'Pass1234!',
          confirmPassword: 'Pass1234!',
          smsCode: '123456',
          referralCode: 'BADCODE',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('密码错误应抛出 UnauthorizedException', async () => {
      captchaService.verify.mockResolvedValue(undefined);
      userService.findByPhone.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          phone: '13800000000',
          password: 'wrong',
          captchaId: 'c1',
          captchaCode: 'abcd',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('登录成功应返回 token', async () => {
      captchaService.verify.mockResolvedValue(undefined);
      userService.findByPhone.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        phone: '13800000000',
        password: 'Pass1234!',
        captchaId: 'c1',
        captchaCode: 'abcd',
      });

      expect(result.accessToken).toBe('token');
    });
  });

  describe('getProfile', () => {
    it('用户不存在应抛出 UnauthorizedException', async () => {
      userService.findById.mockResolvedValue(null);
      await expect(service.getProfile('missing')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
