import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PlatformAccount } from '../../platform/entities/platform-account.entity';
import { PublishDraft } from '../../publish-draft/entities/publish-draft.entity';
import { PublishBatchItem } from '../entities/publish-batch-item.entity';
import { PublishBatch } from '../entities/publish-batch.entity';
import { PublishBatchItemStatus } from '../enums/publish-batch-item-status.enum';
import { PublishBatchStatus } from '../enums/publish-batch-status.enum';
import { PlatformId } from '../../platform/enums/platform-id.enum';
import { PublishResultService } from './publish-result.service';

describe('PublishResultService', () => {
  let service: PublishResultService;
  let batchRepository: jest.Mocked<Repository<PublishBatch>>;
  let itemRepository: jest.Mocked<Repository<PublishBatchItem>>;
  let draftRepository: jest.Mocked<Repository<PublishDraft>>;
  let accountRepository: jest.Mocked<Repository<PlatformAccount>>;
  let dataSource: { transaction: jest.Mock };

  const userId = 'user-1';
  const now = new Date('2026-06-06T08:00:00.000Z').toISOString();

  const baseItem = {
    stepKey: 'step-1',
    entryClientId: 'entry-1',
    accountId: 'acc-1',
    platformId: PlatformId.DOUYIN,
    accountNickname: '账号A',
    videoTitle: '视频标题',
    status: PublishBatchItemStatus.SUCCESS,
    publishedAt: now,
  };

  const validDto = {
    clientBatchId: 'client-batch-1',
    status: PublishBatchStatus.SUCCESS,
    platformScope: 'douyin',
    publishMethod: 'api',
    videoCount: 1,
    taskCount: 1,
    successCount: 1,
    failureCount: 0,
    startedAt: now,
    finishedAt: now,
    items: [baseItem],
  };

  beforeEach(async () => {
    dataSource = {
      transaction: jest.fn(async (cb) =>
        cb({
          getRepository: (entity: unknown) => {
            if (entity === PublishBatch) {
              return {
                create: jest.fn((data) => ({ id: 'batch-new', ...data })),
                save: jest.fn(async (data) => ({
                  id: 'batch-new',
                  createdAt: new Date(now),
                  ...data,
                  items: [
                    {
                      id: 'item-new',
                      batchId: 'batch-new',
                      publishedAt: new Date(now),
                      ...baseItem,
                    },
                  ],
                })),
              };
            }
            if (entity === PublishBatchItem) {
              return {
                create: jest.fn((data) => data),
                save: jest.fn(async (items) =>
                  items.map((item: PublishBatchItem, i: number) => ({
                    id: `item-${i}`,
                    ...item,
                  })),
                ),
              };
            }
            return { update: jest.fn() };
          },
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishResultService,
        {
          provide: getRepositoryToken(PublishBatch),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PublishBatchItem),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(PublishDraft),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(PlatformAccount),
          useValue: { find: jest.fn() },
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(PublishResultService);
    batchRepository = module.get(getRepositoryToken(PublishBatch));
    itemRepository = module.get(getRepositoryToken(PublishBatchItem));
    draftRepository = module.get(getRepositoryToken(PublishDraft));
    accountRepository = module.get(getRepositoryToken(PlatformAccount));
  });

  describe('submit', () => {
    it('计数不一致应抛出 BadRequestException', async () => {
      await expect(
        service.submit(userId, {
          ...validDto,
          taskCount: 2,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('账号不存在应抛出 ForbiddenException', async () => {
      accountRepository.find.mockResolvedValue([]);

      await expect(service.submit(userId, validDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('应成功创建批次', async () => {
      accountRepository.find.mockResolvedValue([
        { id: 'acc-1', userId } as PlatformAccount,
      ]);
      batchRepository.findOne.mockResolvedValue(null);

      const { created, result } = await service.submit(userId, validDto);

      expect(created).toBe(true);
      expect(result.taskCount).toBe(1);
      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('getDetail', () => {
    it('批次不存在应抛出 NotFoundException', async () => {
      batchRepository.findOne.mockResolvedValue(null);
      await expect(service.getDetail(userId, 'missing')).rejects.toThrow(
        '发布批次不存在',
      );
    });
  });
});
