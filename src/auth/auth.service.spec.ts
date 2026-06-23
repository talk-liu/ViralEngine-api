import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { PlatformService } from '../modules/platform/services/platform.service';
import { PublishResultService } from '../modules/publish-result/services/publish-result.service';
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
      | 'updatePassword'
    >
  >;
  let smsService: jest.Mocked<
    Pick<
      SmsService,
      | 'sendRegisterCode'
      | 'verifyRegisterCode'
      | 'sendResetPasswordCode'
      | 'verifyResetPasswordCode'
    >
  >;
  let captchaService: jest.Mocked<Pick<CaptchaService, 'generate' | 'verify'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;
  let platformService: jest.Mocked<Pick<PlatformService, 'countUserAccounts'>>;
  let publishResultService: jest.Mocked<
    Pick<PublishResultService, 'countUserBatches'>
  >;

  const user: User = {
    id: 'user-1',
    phone: '13800000000',
    passwordHash: 'hash',
    referralCode: 'ABCD1234',
    referrerId: null,
    isAdmin: false,
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
      updatePassword: jest.fn(),
    };
    smsService = {
      sendRegisterCode: jest.fn().mockResolvedValue('123456'),
      verifyRegisterCode: jest.fn(),
      sendResetPasswordCode: jest.fn().mockResolvedValue('654321'),
      verifyResetPasswordCode: jest.fn(),
    };
    captchaService = {
      generate: jest.fn().mockResolvedValue({ captchaId: 'c1', image: 'img' }),
      verify: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue('token') };
    platformService = {
      countUserAccounts: jest.fn().mockResolvedValue(0),
    };
    publishResultService = {
      countUserBatches: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: PlatformService, useValue: platformService },
        { provide: PublishResultService, useValue: publishResultService },
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

  describe('sendForgotPasswordSmsCode', () => {
    it('未注册手机号应抛出 BadRequestException', async () => {
      userService.existsByPhone.mockResolvedValue(false);
      await expect(
        service.sendForgotPasswordSmsCode('13800000000'),
      ).rejects.toThrow(BadRequestException);
    });

    it('开发环境应返回 debugCode', async () => {
      userService.existsByPhone.mockResolvedValue(true);
      const result = await service.sendForgotPasswordSmsCode('13800000000');
      expect(result.debugCode).toBe('654321');
    });
  });

  describe('resetPassword', () => {
    it('未注册手机号应抛出 BadRequestException', async () => {
      userService.findByPhone.mockResolvedValue(null);
      await expect(
        service.resetPassword({
          phone: '13800000000',
          smsCode: '123456',
          password: 'Pass1234!',
          confirmPassword: 'Pass1234!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('应重置密码', async () => {
      userService.findByPhone.mockResolvedValue(user);
      (argon2.hash as jest.Mock).mockResolvedValue('new-hash');

      const result = await service.resetPassword({
        phone: '13800000000',
        smsCode: '123456',
        password: 'Pass1234!',
        confirmPassword: 'Pass1234!',
      });

      expect(result.message).toBe('密码重置成功');
      expect(smsService.verifyResetPasswordCode).toHaveBeenCalledWith(
        '13800000000',
        '123456',
      );
      expect(userService.updatePassword).toHaveBeenCalledWith(
        'user-1',
        'new-hash',
      );
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

    it('应返回用户信息与绑定账号、发布数量', async () => {
      userService.findById.mockResolvedValue(user);
      platformService.countUserAccounts.mockResolvedValue(5);
      publishResultService.countUserBatches.mockResolvedValue(48);

      const result = await service.getProfile('user-1');

      expect(platformService.countUserAccounts).toHaveBeenCalledWith('user-1');
      expect(publishResultService.countUserBatches).toHaveBeenCalledWith(
        'user-1',
      );
      expect(result.boundAccountCount).toBe(5);
      expect(result.publishResultCount).toBe(48);
      expect(result.id).toBe(user.id);
    });
  });
});
