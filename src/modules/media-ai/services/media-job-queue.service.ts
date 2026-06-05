import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../redis/redis.constants';
import { resolveMediaJobQueueKey } from '../constants/media-job-queue.constant';
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
  private readonly queuePrefix: string;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    configService: ConfigService,
  ) {
    this.queuePrefix =
      configService.get<string>('mediaAi.queuePrefix') ?? 'media-ai:jobs';
  }

  resolveQueueKey(type: MediaJobType): string {
    return resolveMediaJobQueueKey(type, this.queuePrefix);
  }

  async enqueue(payload: MediaJobQueuePayload): Promise<void> {
    const queueKey = this.resolveQueueKey(payload.type);
    await this.redis.lpush(queueKey, JSON.stringify(payload));
  }
}
