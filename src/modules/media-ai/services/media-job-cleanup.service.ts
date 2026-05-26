import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Not, Repository } from 'typeorm';
import { MediaJob } from '../entities/media-job.entity';
import { MediaJobStatus } from '../enums/media-job-status.enum';
import { MediaAiStorageService } from './media-ai-storage.service';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class MediaJobCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaJobCleanupService.name);
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private retentionHours = 12;

  constructor(
    @InjectRepository(MediaJob)
    private readonly jobRepository: Repository<MediaJob>,
    private readonly storageService: MediaAiStorageService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.retentionHours =
      this.configService.get<number>('mediaAi.outputRetentionHours') ?? 12;
    void this.purgeExpiredArtifacts();
    this.intervalId = setInterval(() => {
      void this.purgeExpiredArtifacts();
    }, CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async purgeExpiredArtifacts(): Promise<number> {
    const cutoff = new Date(Date.now() - this.retentionHours * 3600 * 1000);
    const jobs = await this.jobRepository.find({
      where: [
        {
          status: MediaJobStatus.COMPLETED,
          completedAt: LessThan(cutoff),
          outputKey: Not(IsNull()),
        },
        {
          status: MediaJobStatus.FAILED,
          completedAt: LessThan(cutoff),
          outputKey: Not(IsNull()),
        },
        {
          status: MediaJobStatus.FAILED,
          completedAt: LessThan(cutoff),
          inputKey: Not(IsNull()),
        },
      ],
    });

    if (jobs.length === 0) {
      return 0;
    }

    for (const job of jobs) {
      await this.storageService.removeJobDirectory(job.userId, job.id);
      await this.jobRepository.update(job.id, {
        inputKey: null,
        outputKey: null,
      });
    }

    this.logger.log(
      `Purged expired media job files: count=${jobs.length} retentionHours=${this.retentionHours}`,
    );
    return jobs.length;
  }
}
