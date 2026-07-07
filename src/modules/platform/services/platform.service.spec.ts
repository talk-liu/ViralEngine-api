import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountNetworkProfile } from '../entities/account-network-profile.entity';
import { OAuthBindSession } from '../entities/oauth-bind-session.entity';
import { PlatformAccount } from '../entities/platform-account.entity';
import { PlatformToken } from '../entities/platform-token.entity';
import { BindSessionStatus } from '../enums/bind-session-status.enum';
import { BindStatus } from '../enums/bind-status.enum';
import { PlatformId } from '../enums/platform-id.enum';
import { EncryptionService } from './encryption.service';
import { OAuthProviderRegistry } from './oauth-provider.registry';
import { PlatformService } from './platform.service';
import { OAuthProvider } from './oauth/oauth-provider.interface';

describe('PlatformService', () => {
  let service: PlatformService;
  let accountRepository: jest.Mocked<Repository<PlatformAccount>>;
  let bindSessionRepository: jest.Mocked<Repository<OAuthBindSession>>;
  let oauthRegistry: jest.Mocked<Pick<OAuthProviderRegistry, 'getProvider'>>;
  let provider: OAuthProvider;

  const userId = 'user-1';

  beforeEach(async () => {
    provider = {
      platformId: PlatformId.DOUYIN,
      isConfigured: () => true,
      buildAuthUrl: jest.fn().mockReturnValue('https://oauth.example/auth'),
      exchangeCode: jest.fn(),
      refreshAccessToken: jest.fn(),
      fetchUserInfo: jest.fn(),
    };
    oauthRegistry = {
      getProvider: jest.fn().mockReturnValue(provider),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformService,
        {
          provide: getRepositoryToken(PlatformAccount),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn(),
            create: jest.fn((data) => data),
            delete: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PlatformToken),
          useValue: { findOne: jest.fn(), delete: jest.fn() },
        },
        {
          provide: getRepositoryToken(OAuthBindSession),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn(),
            create: jest.fn((data) => ({ id: 'session-1', ...data })),
            save: jest.fn(async (data) => data),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AccountNetworkProfile),
          useValue: { delete: jest.fn() },
        },
        {
          provide: EncryptionService,
          useValue: { encrypt: jest.fn(), decrypt: jest.fn() },
        },
        { provide: OAuthProviderRegistry, useValue: oauthRegistry },
      ],
    }).compile();

    service = module.get(PlatformService);
    accountRepository = module.get(getRepositoryToken(PlatformAccount));
    bindSessionRepository = module.get(getRepositoryToken(OAuthBindSession));
  });

  describe('createManualAccount', () => {
    it('未开放平台应抛出 BadRequestException', async () => {
      await expect(
        service.createManualAccount(userId, PlatformId.BILIBILI, '测试账号'),
      ).rejects.toThrow(BadRequestException);
    });

    it('应创建手动账号并返回 BoundAccountDto', async () => {
      accountRepository.create.mockImplementation((data) => ({
        id: 'acc-manual-1',
        createdAt: new Date('2026-06-12T08:00:00.000Z'),
        ...data,
      }));
      accountRepository.save.mockImplementation(async (account) => account);

      const result = await service.createManualAccount(
        userId,
        PlatformId.DOUYIN,
        ' 我的抖音号 ',
      );

      expect(accountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          platformId: PlatformId.DOUYIN,
          nickname: '我的抖音号',
          status: BindStatus.BOUND,
          openId: expect.stringMatching(/^manual_/),
        }),
      );
      expect(result.nickname).toBe('我的抖音号');
      expect(result.platformId).toBe(PlatformId.DOUYIN);
      expect(result.status).toBe(BindStatus.BOUND);
    });

    it('应支持 BOSS 直聘手动创建', async () => {
      accountRepository.create.mockImplementation((data) => ({
        id: 'acc-boss-1',
        createdAt: new Date('2026-06-12T08:00:00.000Z'),
        ...data,
      }));
      accountRepository.save.mockImplementation(async (account) => account);

      const result = await service.createManualAccount(
        userId,
        PlatformId.BOSS,
        '招聘主号',
      );

      expect(result.platformId).toBe(PlatformId.BOSS);
      expect(result.platformName).toBe('BOSS直聘');
      expect(result.nickname).toBe('招聘主号');
    });

    it('应支持快手手动创建', async () => {
      accountRepository.create.mockImplementation((data) => ({
        id: 'acc-kuaishou-1',
        createdAt: new Date('2026-06-12T08:00:00.000Z'),
        ...data,
      }));
      accountRepository.save.mockImplementation(async (account) => account);

      const result = await service.createManualAccount(
        userId,
        PlatformId.KUAISHOU,
        '快手主号',
      );

      expect(result.platformId).toBe(PlatformId.KUAISHOU);
      expect(result.platformName).toBe('快手');
      expect(result.nickname).toBe('快手主号');
    });
  });

  describe('startBind', () => {
    it('未开放平台应抛出 BadRequestException', async () => {
      await expect(
        service.startBind(userId, PlatformId.BILIBILI),
      ).rejects.toThrow(BadRequestException);
    });

    it('应创建绑定会话并返回授权 URL', async () => {
      const result = await service.startBind(userId, PlatformId.DOUYIN);
      expect(result.authUrl).toBe('https://oauth.example/auth');
      expect(bindSessionRepository.save).toHaveBeenCalled();
    });
  });

  describe('findOwnedAccount', () => {
    it('账号不存在应抛出 NotFoundException', async () => {
      accountRepository.findOne.mockResolvedValue(null);
      await expect(
        service.findOwnedAccount(userId, 'missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateAccountNickname', () => {
    const accountId = 'acc-1';
    const baseAccount = {
      id: accountId,
      userId,
      platformId: PlatformId.DOUYIN,
      openId: 'openid-1',
      nickname: '测试账号',
      avatarUrl: '',
      status: BindStatus.BOUND,
      boundAt: new Date('2026-05-20T08:00:00.000Z'),
      expiresAt: null,
      lastError: null,
      createdAt: new Date('2026-05-20T08:00:00.000Z'),
    } as PlatformAccount;

    it('空名称应抛出 BadRequestException', async () => {
      await expect(
        service.updateAccountNickname(userId, accountId, '   '),
      ).rejects.toThrow(BadRequestException);
    });

    it('应更新备注名并返回 BoundAccountDto', async () => {
      accountRepository.findOne.mockResolvedValue({ ...baseAccount });
      accountRepository.save.mockImplementation(async (account) => account);

      const result = await service.updateAccountNickname(
        userId,
        accountId,
        ' 新备注名 ',
      );

      expect(accountRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ nickname: '新备注名' }),
      );
      expect(result.nickname).toBe('新备注名');
    });
  });

  describe('updateAccountStatus', () => {
    const accountId = 'acc-1';
    const baseAccount = {
      id: accountId,
      userId,
      platformId: PlatformId.DOUYIN,
      openId: 'openid-1',
      nickname: '测试账号',
      avatarUrl: '',
      status: BindStatus.BOUND,
      boundAt: new Date('2026-05-20T08:00:00.000Z'),
      expiresAt: null,
      lastError: null,
      createdAt: new Date('2026-05-20T08:00:00.000Z'),
    } as PlatformAccount;

    it('应更新为 expired 并写入 lastError', async () => {
      accountRepository.findOne.mockResolvedValue({ ...baseAccount });
      accountRepository.save.mockImplementation(async (account) => account);

      const result = await service.updateAccountStatus(
        userId,
        accountId,
        BindStatus.EXPIRED,
        '授权已过期',
      );

      expect(accountRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: BindStatus.EXPIRED,
          lastError: '授权已过期',
        }),
      );
      expect(result.status).toBe(BindStatus.EXPIRED);
      expect(result.lastError).toBe('授权已过期');
    });

    it('恢复为 bound 时应清空 lastError', async () => {
      accountRepository.findOne.mockResolvedValue({
        ...baseAccount,
        status: BindStatus.ERROR,
        lastError: '发布失败',
      });
      accountRepository.save.mockImplementation(async (account) => account);

      const result = await service.updateAccountStatus(
        userId,
        accountId,
        BindStatus.BOUND,
      );

      expect(accountRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: BindStatus.BOUND,
          lastError: null,
        }),
      );
      expect(result.status).toBe(BindStatus.BOUND);
      expect(result.lastError).toBeUndefined();
    });
  });

  describe('getBindSession', () => {
    it('无权访问应抛出 ForbiddenException', async () => {
      bindSessionRepository.findOne.mockResolvedValue({
        id: 'session-1',
        userId: 'other-user',
        status: BindSessionStatus.PENDING,
        expiresAt: new Date(Date.now() + 60_000),
      } as OAuthBindSession);

      await expect(
        service.getBindSession(userId, 'session-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
