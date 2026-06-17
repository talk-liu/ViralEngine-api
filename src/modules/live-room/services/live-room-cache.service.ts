import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../redis/redis.constants';
import {
  LiveRoomEnterResponseDto,
  LiveRoomPublicListResponseDto,
} from '../dto/live-room-response.dto';

const PUBLIC_CACHE_KEY = 'live-room:public';
const enterCacheKey = (roomId: string) => `live-room:enter:${roomId}`;

/** 兜底 TTL（秒）；正常靠写操作主动失效，避免漏删时永久脏数据 */
const SAFETY_TTL_SEC = 86400;

@Injectable()
export class LiveRoomCacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async getPublic(): Promise<LiveRoomPublicListResponseDto | null> {
    return this.getJson<LiveRoomPublicListResponseDto>(PUBLIC_CACHE_KEY);
  }

  async setPublic(data: LiveRoomPublicListResponseDto): Promise<void> {
    await this.setJson(PUBLIC_CACHE_KEY, data);
  }

  async getEnter(roomId: string): Promise<LiveRoomEnterResponseDto | null> {
    return this.getJson<LiveRoomEnterResponseDto>(enterCacheKey(roomId));
  }

  async setEnter(
    roomId: string,
    data: LiveRoomEnterResponseDto,
  ): Promise<void> {
    await this.setJson(enterCacheKey(roomId), data);
  }

  /** 管理员写操作后调用：清 public 列表 + 指定直播间 enter 缓存 */
  async invalidateOnWrite(roomId: string): Promise<void> {
    await this.redis.del(PUBLIC_CACHE_KEY, enterCacheKey(roomId));
  }

  /** 创建直播间后只需清 public 列表 */
  async invalidatePublic(): Promise<void> {
    await this.redis.del(PUBLIC_CACHE_KEY);
  }

  private async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  }

  private async setJson(key: string, data: unknown): Promise<void> {
    await this.redis.setex(key, SAFETY_TTL_SEC, JSON.stringify(data));
  }
}
