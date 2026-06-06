import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformAccount } from '../../platform/entities/platform-account.entity';
import { BindStatus } from '../../platform/enums/bind-status.enum';
import { PlatformId } from '../../platform/enums/platform-id.enum';
import { PublishDraft } from '../entities/publish-draft.entity';
import { PublishDraftAsset } from '../entities/publish-draft-asset.entity';
import { DraftStatus } from '../enums/draft-status.enum';
import { PublishDraftService } from './publish-draft.service';
import { PublishDraftStorageService } from './publish-draft-storage.service';

describe('PublishDraftService', () => {
  let service: PublishDraftService;
  let draftRepository: jest.Mocked<Repository<PublishDraft>>;
  let assetRepository: jest.Mocked<Repository<PublishDraftAsset>>;
  let accountRepository: jest.Mocked<Repository<PlatformAccount>>;
  let storageService: jest.Mocked<Pick<PublishDraftStorageService, 'getSignedUrl' | 'deleteFile'>>;

  const userId = 'user-1';
  const draftId = 'draft-1';
  const now = new Date('2026-06-06T08:00:00.000Z');

  const draft: PublishDraft = {
    id: draftId,
    userId,
    listTitle: '测试草稿',
    videoFileName: 'video.mp4',
    videoAssetId: null,
    videoLocalPath: null,
    status: DraftStatus.DRAFT,
    payload: { title: '测试', accountIds: [] },
    createdAt: now,
    updatedAt: now,
    user: {} as PublishDraft['user'],
    assets: [],
  };

  beforeEach(async () => {
    storageService = {
      getSignedUrl: jest.fn().mockReturnValue('https://signed/url'),
      deleteFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishDraftService,
        {
          provide: getRepositoryToken(PublishDraft),
          useValue: {
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PublishDraftAsset),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(PlatformAccount),
          useValue: { find: jest.fn() },
        },
        { provide: PublishDraftStorageService, useValue: storageService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, number> = {
                'publishDraft.maxPerUser': 100,
                'publishDraft.videoMaxBytes': 4 * 1024 * 1024 * 1024,
                'publishDraft.coverMaxBytes': 10 * 1024 * 1024,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get(PublishDraftService);
    draftRepository = module.get(getRepositoryToken(PublishDraft));
    assetRepository = module.get(getRepositoryToken(PublishDraftAsset));
    accountRepository = module.get(getRepositoryToken(PlatformAccount));
  });

  describe('create', () => {
    it('超过配额应抛出 BadRequestException', async () => {
      draftRepository.count.mockResolvedValue(100);

      await expect(
        service.create(userId, {
          payload: { title: '标题', accountIds: [] },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('应创建草稿', async () => {
      draftRepository.count.mockResolvedValue(0);
      draftRepository.create.mockImplementation((data) => ({
        ...draft,
        ...data,
      }));
      draftRepository.save.mockImplementation(async (data) => data as PublishDraft);
      assetRepository.find.mockResolvedValue([]);

      const result = await service.create(userId, {
        payload: { title: '  标题  ', accountIds: [] },
        videoFileName: 'video.mp4',
      });

      expect(result.listTitle).toBe('标题');
    });
  });

  describe('getDetail', () => {
    it('草稿不存在应抛出 NotFoundException', async () => {
      draftRepository.findOne.mockResolvedValue(null);
      await expect(service.getDetail(userId, draftId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('应删除草稿及关联资产文件', async () => {
      draftRepository.findOne.mockResolvedValue(draft);
      assetRepository.find.mockResolvedValue([
        { storageKey: 'key-1' } as PublishDraftAsset,
      ]);
      draftRepository.remove.mockResolvedValue(draft);

      await service.remove(userId, draftId);

      expect(storageService.deleteFile).toHaveBeenCalledWith('key-1');
      expect(draftRepository.remove).toHaveBeenCalled();
    });
  });

  describe('validateAccountIds (via create)', () => {
    it('账号不存在应抛出 UnprocessableEntityException', async () => {
      draftRepository.count.mockResolvedValue(0);
      accountRepository.find.mockResolvedValue([]);

      await expect(
        service.create(userId, {
          payload: { title: '标题', accountIds: ['acc-missing'] },
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('非 BOUND 账号应抛出 UnprocessableEntityException', async () => {
      draftRepository.count.mockResolvedValue(0);
      accountRepository.find.mockResolvedValue([
        {
          id: 'acc-1',
          userId,
          platformId: PlatformId.DOUYIN,
          status: BindStatus.EXPIRED,
        } as PlatformAccount,
      ]);

      await expect(
        service.create(userId, {
          payload: { title: '标题', accountIds: ['acc-1'] },
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
