import { ApiProperty } from '@nestjs/swagger';

export class LiveRoomScriptDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  sortOrder: number;
}

export class LiveRoomDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  url: string;

  @ApiProperty({ type: [LiveRoomScriptDto] })
  scripts: LiveRoomScriptDto[];

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class LiveRoomListResponseDto {
  @ApiProperty({ type: [LiveRoomDetailDto] })
  items: LiveRoomDetailDto[];

  @ApiProperty()
  total: number;
}

export class LiveRoomPublicItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  url: string;

  @ApiProperty({ type: [String], description: '话术内容列表' })
  scripts: string[];
}

export class LiveRoomPublicListResponseDto {
  @ApiProperty({ type: [LiveRoomPublicItemDto] })
  items: LiveRoomPublicItemDto[];

  @ApiProperty()
  total: number;
}

export class LiveRoomEnterResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  url: string;

  @ApiProperty({ type: [String], description: '话术内容列表，前端随机选用' })
  scripts: string[];
}
