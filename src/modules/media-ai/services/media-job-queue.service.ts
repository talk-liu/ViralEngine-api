import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../redis/redis.constants';
import { MediaJobType } from '../enums/media-job-type.enum';

export interface MediaJobQueuePayload {
  jobId: string;
  userId: string;
  type: MediaJobType;
  inputKey: string;
  outputKey: string;
  params: Record<string, unknown>;
}

@Injectable()
export class MediaJobQueueService {
  private readonly queueKey: string;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    configService: ConfigService,
  ) {
    this.queueKey =
      configService.get<string>('mediaAi.queueKey') ?? 'media-ai:jobs';
  }

  async enqueue(payload: MediaJobQueuePayload): Promise<void> {
    await this.redis.lpush(this.queueKey, JSON.stringify(payload));
  }
}
