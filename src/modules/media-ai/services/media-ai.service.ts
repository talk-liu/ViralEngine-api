import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'path';
import { Repository } from 'typeorm';
import { buildUniqueFileName } from '../../publish-draft/utils/upload-filename.util';
import { CreateSubtitleJobDto } from '../dto/create-subtitle-job.dto';
import { CreateWatermarkJobDto } from '../dto/create-watermark-job.dto';
import type { MediaJobResponseDto } from '../dto/media-job-response.dto';
import { MediaJob } from '../entities/media-job.entity';
import { MediaJobStatus } from '../enums/media-job-status.enum';
import { MediaJobType } from '../enums/media-job-type.enum';
import { toMediaJobResponse } from '../utils/media-job.mapper';
import { MediaAiStorageService } from './media-ai-storage.service';
import { MediaJobQueueService } from './media-job-queue.service';

const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
]);

@Injectable()
export class MediaAiService {
  constructor(
    @InjectRepository(MediaJob)
    private readonly jobRepository: Repository<MediaJob>,
    private readonly storageService: MediaAiStorageService,
    private readonly queueService: MediaJobQueueService,
  ) {}

  async getJob(userId: string, jobId: string): Promise<MediaJobResponseDto> {
    const job = await this.findOwnedJob(userId, jobId);
    return toMediaJobResponse(job, (key) => this.storageService.getSignedUrl(key));
  }

  async createWatermarkJob(
    userId: string,
    file: Express.Multer.File,
    dto: CreateWatermarkJobDto,
  ): Promise<MediaJobResponseDto> {
    const inputFileName = buildUniqueFileName(
      'video',
      file.mimetype,
      file.originalname,
    );
    const ext = path.extname(inputFileName) || '.mp4';

    return this.createVideoJob({
      userId,
      file,
      type: MediaJobType.WATERMARK,
      params: {
        text: dto.text,
        position: dto.position ?? 'bottom-right',
        fontSize: dto.fontSize ?? 24,
      },
      outputFileName: `watermarked${ext}`,
    });
  }

  async createSubtitleJob(
    userId: string,
    file: Express.Multer.File,
    dto: CreateSubtitleJobDto,
  ): Promise<MediaJobResponseDto> {
    const format = dto.format ?? 'srt';

    return this.createVideoJob({
      userId,
      file,
      type: MediaJobType.SUBTITLE,
      params: {
        language: dto.language,
        format,
      },
      outputFileName: `subtitles.${format}`,
    });
  }

  async markProcessing(jobId: string): Promise<void> {
    await this.jobRepository.update(jobId, {
      status: MediaJobStatus.PROCESSING,
      progress: 10,
      startedAt: new Date(),
    });
  }

  async completeJob(
    jobId: string,
    payload: {
      status: 'completed' | 'failed';
      outputKey?: string;
      errorMessage?: string;
      progress?: number;
    },
  ): Promise<void> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('任务不存在');
    }

    if (payload.status === 'completed') {
      await this.jobRepository.update(jobId, {
        status: MediaJobStatus.COMPLETED,
        progress: payload.progress ?? 100,
        outputKey: payload.outputKey ?? job.outputKey,
        errorMessage: null,
        completedAt: new Date(),
      });
      return;
    }

    await this.jobRepository.update(jobId, {
      status: MediaJobStatus.FAILED,
      progress: payload.progress ?? job.progress,
      errorMessage: payload.errorMessage ?? '处理失败',
      completedAt: new Date(),
    });
  }

  private async createVideoJob(options: {
    userId: string;
    file: Express.Multer.File;
    type: MediaJobType.WATERMARK | MediaJobType.SUBTITLE;
    params: Record<string, unknown>;
    outputFileName: string;
  }): Promise<MediaJobResponseDto> {
    this.assertVideoFile(options.file);

    const job = await this.jobRepository.save(
      this.jobRepository.create({
        userId: options.userId,
        type: options.type,
        status: MediaJobStatus.PENDING,
        params: options.params,
      }),
    );

    const inputFileName = buildUniqueFileName(
      'video',
      options.file.mimetype,
      options.file.originalname,
    );
    const inputKey = this.storageService.buildInputKey(
      options.userId,
      job.id,
      inputFileName,
    );
    const outputKey = this.storageService.buildOutputKey(
      options.userId,
      job.id,
      options.outputFileName,
    );

    await this.storageService.saveFile(inputKey, options.file.buffer);
    job.inputKey = inputKey;
    job.outputKey = outputKey;
    await this.jobRepository.save(job);

    await this.queueService.enqueue({
      jobId: job.id,
      userId: options.userId,
      type: options.type,
      inputKey,
      outputKey,
      params: job.params as Record<string, unknown>,
    });

    return toMediaJobResponse(job, (key) => this.storageService.getSignedUrl(key));
  }

  private async findOwnedJob(userId: string, jobId: string): Promise<MediaJob> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId, userId },
    });
    if (!job) {
      throw new NotFoundException('任务不存在');
    }
    return job;
  }

  private assertVideoFile(file: Express.Multer.File): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException('请上传视频文件');
    }
    if (!VIDEO_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('不支持的视频格式');
    }
  }
}
