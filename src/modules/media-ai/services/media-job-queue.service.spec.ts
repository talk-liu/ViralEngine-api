import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { REDIS_CLIENT } from '../../../redis/redis.constants';
import { MediaJobType } from '../enums/media-job-type.enum';
import { MediaJobQueueService } from './media-job-queue.service';

describe('MediaJobQueueService', () => {
  let service: MediaJobQueueService;
  let redis: { lpush: jest.Mock };

  beforeEach(async () => {
    redis = { lpush: jest.fn().mockResolvedValue(1) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaJobQueueService,
        { provide: REDIS_CLIENT, useValue: redis },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('media-ai:jobs') },
        },
      ],
    }).compile();

    service = module.get(MediaJobQueueService);
  });

  it('resolveQueueKey 应委托常量解析', () => {
    expect(service.resolveQueueKey(MediaJobType.TTS)).toBe('media-ai:jobs:tts');
  });

  it('enqueue 应向 Redis 推送 JSON payload', async () => {
    const payload = {
      jobId: 'job-1',
      userId: 'user-1',
      type: MediaJobType.WATERMARK,
      inputKey: 'in',
      outputKey: 'out',
      params: { text: 'wm' },
    };

    await service.enqueue(payload);

    expect(redis.lpush).toHaveBeenCalledWith(
      'media-ai:jobs:cpu',
      JSON.stringify(payload),
    );
  });
});
