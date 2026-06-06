import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaJob } from '../entities/media-job.entity';
import { MediaJobStatus } from '../enums/media-job-status.enum';
import { MediaJobType } from '../enums/media-job-type.enum';
import { MediaAiService } from './media-ai.service';
import { MediaAiStorageService } from './media-ai-storage.service';
import { MediaJobQueueService } from './media-job-queue.service';

describe('MediaAiService', () => {
  let service: MediaAiService;
  let jobRepository: jest.Mocked<Repository<MediaJob>>;
  let storageService: jest.Mocked<
    Pick<
      MediaAiStorageService,
      | 'buildInputKey'
      | 'buildOutputKey'
      | 'saveFile'
      | 'getSignedUrl'
      | 'removeJobDirectory'
      | 'readJsonFile'
    >
  >;
  let queueService: jest.Mocked<Pick<MediaJobQueueService, 'enqueue'>>;

  const userId = 'user-1';
  const jobId = 'job-1';
  const now = new Date('2026-06-06T08:00:00.000Z');

  const job: MediaJob = {
    id: jobId,
    userId,
    type: MediaJobType.WATERMARK,
    status: MediaJobStatus.PENDING,
    progress: 0,
    inputKey: 'input.mp4',
    outputKey: 'output.mp4',
    params: {},
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    user: {} as MediaJob['user'],
  };

  const videoFile = {
    buffer: Buffer.from('video'),
    mimetype: 'video/mp4',
    originalname: 'clip.mp4',
    size: 100,
  } as Express.Multer.File;

  beforeEach(async () => {
    storageService = {
      buildInputKey: jest.fn().mockReturnValue('input-key'),
      buildOutputKey: jest.fn().mockReturnValue('output-key'),
      saveFile: jest.fn().mockResolvedValue(undefined),
      getSignedUrl: jest.fn().mockReturnValue('https://signed/url'),
      removeJobDirectory: jest.fn().mockResolvedValue(undefined),
      readJsonFile: jest.fn(),
    };
    queueService = { enqueue: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaAiService,
        {
          provide: getRepositoryToken(MediaJob),
          useValue: {
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn((data) => ({
              id: jobId,
              createdAt: now,
              updatedAt: now,
              progress: 0,
              ...data,
            })),
            save: jest.fn(async (data) => ({
              createdAt: now,
              updatedAt: now,
              progress: 0,
              ...data,
            })),
            remove: jest.fn(),
            update: jest.fn(),
          },
        },
        { provide: MediaAiStorageService, useValue: storageService },
        { provide: MediaJobQueueService, useValue: queueService },
      ],
    }).compile();

    service = module.get(MediaAiService);
    jobRepository = module.get(getRepositoryToken(MediaJob));
  });

  describe('listJobs', () => {
    it('应返回分页任务列表', async () => {
      jobRepository.findAndCount.mockResolvedValue([[job], 1]);

      const result = await service.listJobs(userId, {});
      expect(result.total).toBe(1);
      expect(result.items[0].id).toBe(jobId);
    });
  });

  describe('getJob', () => {
    it('任务不存在应抛出 NotFoundException', async () => {
      jobRepository.findOne.mockResolvedValue(null);
      await expect(service.getJob(userId, jobId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createWatermarkJob', () => {
    it('不支持的视频格式应抛出 BadRequestException', async () => {
      await expect(
        service.createWatermarkJob(userId, {
          ...videoFile,
          mimetype: 'text/plain',
          originalname: 'readme.txt',
        }, { text: 'watermark' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('应创建水印任务并入队', async () => {
      const result = await service.createWatermarkJob(
        userId,
        videoFile,
        { text: 'watermark' },
      );

      expect(result.type).toBe(MediaJobType.WATERMARK);
      expect(queueService.enqueue).toHaveBeenCalled();
      expect(storageService.saveFile).toHaveBeenCalled();
    });
  });

  describe('createLiveSliceJob', () => {
    it('minDuration 大于 maxDuration 应抛出异常', async () => {
      await expect(
        service.createLiveSliceJob(userId, videoFile, {
          minDuration: 60,
          maxDuration: 15,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeJob', () => {
    it('应删除任务及存储目录', async () => {
      jobRepository.findOne.mockResolvedValue(job);
      jobRepository.remove.mockResolvedValue(job);

      await service.removeJob(userId, jobId);

      expect(storageService.removeJobDirectory).toHaveBeenCalledWith(
        userId,
        jobId,
      );
      expect(jobRepository.remove).toHaveBeenCalledWith(job);
    });
  });
});
