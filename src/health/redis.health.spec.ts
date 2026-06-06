import { HealthCheckError } from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { RedisHealthIndicator } from './redis.health';

describe('RedisHealthIndicator', () => {
  let indicator: RedisHealthIndicator;
  let redis: { ping: jest.Mock };

  beforeEach(async () => {
    redis = { ping: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisHealthIndicator,
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();

    indicator = module.get(RedisHealthIndicator);
  });

  it('Redis 正常时应返回 healthy', async () => {
    redis.ping.mockResolvedValue('PONG');
    const result = await indicator.isHealthy('redis');
    expect(result.redis.status).toBe('up');
  });

  it('Redis 异常时应抛出 HealthCheckError', async () => {
    redis.ping.mockRejectedValue(new Error('connection refused'));
    await expect(indicator.isHealthy('redis')).rejects.toThrow(
      HealthCheckError,
    );
  });
});
