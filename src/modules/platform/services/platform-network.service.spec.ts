import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountNetworkProfile } from '../entities/account-network-profile.entity';
import { ProxyType } from '../enums/proxy-type.enum';
import { EncryptionService } from './encryption.service';
import { PlatformNetworkService } from './platform-network.service';
import { PlatformService } from './platform.service';

describe('PlatformNetworkService', () => {
  let service: PlatformNetworkService;
  let networkRepository: jest.Mocked<Repository<AccountNetworkProfile>>;
  let platformService: jest.Mocked<Pick<PlatformService, 'findOwnedAccount'>>;
  let encryptionService: jest.Mocked<Pick<EncryptionService, 'encrypt'>>;

  const userId = 'user-1';
  const accountId = 'acc-1';

  beforeEach(async () => {
    platformService = { findOwnedAccount: jest.fn().mockResolvedValue({ id: accountId }) };
    encryptionService = { encrypt: jest.fn().mockReturnValue('encrypted') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformNetworkService,
        {
          provide: getRepositoryToken(AccountNetworkProfile),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn((data) => data),
            save: jest.fn(async (data) => ({ id: 'profile-1', ...data })),
          },
        },
        { provide: PlatformService, useValue: platformService },
        { provide: EncryptionService, useValue: encryptionService },
      ],
    }).compile();

    service = module.get(PlatformNetworkService);
    networkRepository = module.get(getRepositoryToken(AccountNetworkProfile));
  });

  describe('getNetwork', () => {
    it('无配置时应返回默认值', async () => {
      networkRepository.findOne.mockResolvedValue(null);
      const result = await service.getNetwork(userId, accountId);
      expect(result.enabled).toBe(false);
      expect(result.proxyType).toBe(ProxyType.NONE);
    });
  });

  describe('upsertNetwork', () => {
    it('应创建并保存网络配置', async () => {
      networkRepository.findOne.mockResolvedValue(null);
      const result = await service.upsertNetwork(userId, accountId, {
        enabled: true,
        proxyType: ProxyType.HTTP,
        host: '127.0.0.1',
        port: 7890,
        password: 'secret',
      });

      expect(encryptionService.encrypt).toHaveBeenCalledWith('secret');
      expect(result.enabled).toBe(true);
    });
  });

  describe('testNetwork', () => {
    it('代理缺少 host/port 应抛出 BadRequestException', async () => {
      await expect(
        service.testNetwork(userId, accountId, {
          proxyType: ProxyType.HTTP,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('应调用 IP 探测并返回结果', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({
          status: 'success',
          query: '1.2.3.4',
          countryCode: 'CN',
          regionName: 'Beijing',
          city: 'Beijing',
          isp: 'ISP',
        }),
      });
      networkRepository.findOne.mockResolvedValue(null);

      const result = await service.testNetwork(userId, accountId, {});
      expect(result.ip).toBe('1.2.3.4');
    });
  });
});
