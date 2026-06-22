import { Test, TestingModule } from '@nestjs/testing';
import { REDIS_CLIENT } from '../../../redis/redis.constants';
import { LiveRoomCacheService } from './live-room-cache.service';

describe('LiveRoomCacheService', () => {
  let service: LiveRoomCacheService;
  let redis: {
    get: jest.Mock;
    setex: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveRoomCacheService,
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();

    service = module.get(LiveRoomCacheService);
  });

  it('getPublic 缓存命中时应返回解析结果', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ items: [], total: 0 }));

    await expect(service.getPublic('ABC12345')).resolves.toEqual({
      items: [],
      total: 0,
    });
    expect(redis.get).toHaveBeenCalledWith('live-room:public:ABC12345');
  });

  it('setPublic 应写入 Redis 并设置兜底 TTL', async () => {
    const data = {
      items: [{ id: 'r1', name: 'test', url: 'https://a.com', scripts: ['hi'] }],
      total: 1,
    };

    await service.setPublic('abc12345', data);

    expect(redis.setex).toHaveBeenCalledWith(
      'live-room:public:ABC12345',
      86400,
      JSON.stringify(data),
    );
  });

  it('invalidateOnWrite 应同时删除 public 与 enter 缓存', async () => {
    await service.invalidateOnWrite('room-1', 'ABC12345');

    expect(redis.del).toHaveBeenCalledWith(
      'live-room:public:ABC12345',
      'live-room:enter:room-1',
    );
  });

  it('invalidatePublic 应只删除对应邀请码 public 缓存', async () => {
    await service.invalidatePublic('abc12345');

    expect(redis.del).toHaveBeenCalledWith('live-room:public:ABC12345');
  });
});
