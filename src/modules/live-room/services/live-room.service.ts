import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { SaveLiveRoomDto } from '../dto/save-live-room.dto';
import { LiveRoomScript } from '../entities/live-room-script.entity';
import { LiveRoom } from '../entities/live-room.entity';
import {
  normalizeScripts,
  toLiveRoomDetail,
  toLiveRoomEnterResponse,
  toLiveRoomPublicItem,
} from '../utils/live-room.mapper';
import { LiveRoomCacheService } from './live-room-cache.service';

@Injectable()
export class LiveRoomService {
  constructor(
    @InjectRepository(LiveRoom)
    private readonly roomRepository: Repository<LiveRoom>,
    @InjectRepository(LiveRoomScript)
    private readonly scriptRepository: Repository<LiveRoomScript>,
    private readonly cacheService: LiveRoomCacheService,
  ) {}

  async listForAdmin() {
    const rooms = await this.findAllWithScripts();
    return {
      items: rooms.map((room) => toLiveRoomDetail(room)),
      total: rooms.length,
    };
  }

  async listPublic(inviteCode: string) {
    const normalizedInviteCode = inviteCode.trim().toUpperCase();
    const cached = await this.cacheService.getPublic(normalizedInviteCode);
    if (cached) {
      return cached;
    }

    const rooms = await this.findByInviteCodeWithScripts(normalizedInviteCode);
    const result = {
      items: rooms.map((room) => toLiveRoomPublicItem(room)),
      total: rooms.length,
    };
    await this.cacheService.setPublic(normalizedInviteCode, result);
    return result;
  }

  async getForAdmin(roomId: string) {
    const room = await this.findRoomWithScripts(roomId);
    return toLiveRoomDetail(room);
  }

  async enter(roomId: string) {
    const cached = await this.cacheService.getEnter(roomId);
    if (cached) {
      return cached;
    }

    const room = await this.findRoomWithScripts(roomId);
    const result = toLiveRoomEnterResponse(room);
    await this.cacheService.setEnter(roomId, result);
    return result;
  }

  async create(dto: SaveLiveRoomDto) {
    const scripts = this.parseScripts(dto.scripts);
    const inviteCode = await this.generateUniqueInviteCode();
    const room = this.roomRepository.create({
      name: dto.name.trim(),
      url: dto.url.trim(),
      inviteCode,
      scripts: scripts.map((content, index) =>
        this.scriptRepository.create({ content, sortOrder: index }),
      ),
    });

    const saved = await this.roomRepository.save(room);
    await this.cacheService.invalidatePublic(saved.inviteCode);

    return toLiveRoomDetail(await this.findRoomWithScripts(saved.id));
  }

  async update(roomId: string, dto: SaveLiveRoomDto) {
    const room = await this.findRoomWithScripts(roomId);
    const scripts = this.parseScripts(dto.scripts);

    room.name = dto.name.trim();
    room.url = dto.url.trim();

    await this.roomRepository.manager.transaction(async (manager) => {
      await manager.save(room);
      await manager.delete(LiveRoomScript, { roomId: room.id });
      await manager.save(
        scripts.map((content, index) =>
          manager.create(LiveRoomScript, {
            roomId: room.id,
            content,
            sortOrder: index,
          }),
        ),
      );
    });

    await this.cacheService.invalidateOnWrite(roomId, room.inviteCode);

    return toLiveRoomDetail(await this.findRoomWithScripts(room.id));
  }

  async remove(roomId: string): Promise<void> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('直播间不存在');
    }
    await this.roomRepository.remove(room);
    await this.cacheService.invalidateOnWrite(roomId, room.inviteCode);
  }

  private async findByInviteCodeWithScripts(
    inviteCode: string,
  ): Promise<LiveRoom[]> {
    return this.roomRepository.find({
      where: { inviteCode },
      relations: { scripts: true },
      order: { createdAt: 'ASC' },
    });
  }

  private async findAllWithScripts(): Promise<LiveRoom[]> {
    return this.roomRepository.find({
      relations: { scripts: true },
      order: { createdAt: 'ASC' },
    });
  }

  private async findRoomWithScripts(roomId: string): Promise<LiveRoom> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: { scripts: true },
    });
    if (!room) {
      throw new NotFoundException('直播间不存在');
    }
    return room;
  }

  private parseScripts(scripts: string[]): string[] {
    const normalized = normalizeScripts(scripts);
    if (normalized.length === 0) {
      throw new BadRequestException('至少需要一条话术');
    }
    return normalized;
  }

  private async generateUniqueInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = randomBytes(4).toString('hex').toUpperCase();
      const exists = await this.roomRepository.existsBy({ inviteCode: code });
      if (!exists) {
        return code;
      }
    }

    throw new ConflictException('邀请码生成失败，请重试');
  }
}
