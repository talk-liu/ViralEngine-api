import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaJob } from '../entities/media-job.entity';
import { MediaJobStatus } from '../enums/media-job-status.enum';
import { MediaJobCleanupService } from './media-job-cleanup.service';
import { MediaAiStorageService } from './media-ai-storage.service';

describe('MediaJobCleanupService', () => {
  let service: MediaJobCleanupService;
  let jobRepository: jest.Mocked<Repository<MediaJob>>;
  let storageService: jest.Mocked<
    Pick<MediaAiStorageService, 'removeJobDirectory'>
  >;

  beforeEach(async () => {
    storageService = { removeJobDirectory: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaJobCleanupService,
        {
          provide: getRepositoryToken(MediaJob),
          useValue: {
            find: jest.fn(),
            update: jest.fn(),
          },
        },
        { provide: MediaAiStorageService, useValue: storageService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(12) },
        },
      ],
    }).compile();

    service = module.get(MediaJobCleanupService);
    jobRepository = module.get(getRepositoryToken(MediaJob));
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('无过期任务时应返回 0', async () => {
    jobRepository.find.mockResolvedValue([]);
    await expect(service.purgeExpiredArtifacts()).resolves.toBe(0);
  });

  it('应清理过期任务文件并清空 key', async () => {
    jobRepository.find.mockResolvedValue([
      {
        id: 'job-1',
        userId: 'user-1',
        status: MediaJobStatus.COMPLETED,
        outputKey: 'out',
        inputKey: 'in',
      } as MediaJob,
    ]);

    const count = await service.purgeExpiredArtifacts();

    expect(count).toBe(1);
    expect(storageService.removeJobDirectory).toHaveBeenCalledWith(
      'user-1',
      'job-1',
    );
    expect(jobRepository.update).toHaveBeenCalledWith('job-1', {
      inputKey: null,
      outputKey: null,
    });
  });
});
