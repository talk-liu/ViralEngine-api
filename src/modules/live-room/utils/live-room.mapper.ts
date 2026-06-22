import { LiveRoom } from '../entities/live-room.entity';
import { LiveRoomScript } from '../entities/live-room-script.entity';
import {
  LiveRoomDetailDto,
  LiveRoomEnterResponseDto,
  LiveRoomPublicItemDto,
} from '../dto/live-room-response.dto';

function sortScripts(scripts: LiveRoomScript[]): LiveRoomScript[] {
  return [...scripts].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function toLiveRoomDetail(room: LiveRoom): LiveRoomDetailDto {
  const scripts = sortScripts(room.scripts ?? []);

  return {
    id: room.id,
    name: room.name,
    url: room.url,
    inviteCode: room.inviteCode,
    scripts: scripts.map((script) => ({
      id: script.id,
      content: script.content,
      sortOrder: script.sortOrder,
    })),
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  };
}

export function toLiveRoomPublicItem(room: LiveRoom): LiveRoomPublicItemDto {
  const scripts = sortScripts(room.scripts ?? []);

  return {
    id: room.id,
    name: room.name,
    url: room.url,
    scripts: scripts.map((script) => script.content),
  };
}

export function toLiveRoomEnterResponse(room: LiveRoom): LiveRoomEnterResponseDto {
  return toLiveRoomPublicItem(room);
}

export function normalizeScripts(scripts: string[]): string[] {
  return scripts.map((script) => script.trim()).filter(Boolean);
}
