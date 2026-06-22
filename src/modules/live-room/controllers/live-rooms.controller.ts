import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../../../common/dto/api-error.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import {
  LiveRoomDetailDto,
  LiveRoomEnterResponseDto,
  LiveRoomListResponseDto,
  LiveRoomPublicListResponseDto,
} from '../dto/live-room-response.dto';
import { SaveLiveRoomDto } from '../dto/save-live-room.dto';
import { ListLiveRoomsPublicQueryDto } from '../dto/list-live-rooms-public-query.dto';
import { LiveRoomService } from '../services/live-room.service';

@ApiTags('Live Room')
@Controller('live-rooms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
export class LiveRoomsController {
  constructor(private readonly liveRoomService: LiveRoomService) {}

  @Get('public')
  @ApiOperation({ summary: '用户端：按邀请码查询直播间列表（含话术）' })
  @ApiOkResponse({ type: LiveRoomPublicListResponseDto })
  listPublic(@Query() query: ListLiveRoomsPublicQueryDto) {
    return this.liveRoomService.listPublic(query.inviteCode);
  }

  @Get()
  @ApiOperation({ summary: '管理端：直播间列表' })
  @ApiOkResponse({ type: LiveRoomListResponseDto })
  listForAdmin() {
    return this.liveRoomService.listForAdmin();
  }

  @Post()
  @ApiOperation({ summary: '创建直播间' })
  @ApiCreatedResponse({ type: LiveRoomDetailDto })
  create(@Body() dto: SaveLiveRoomDto) {
    return this.liveRoomService.create(dto);
  }

  @Get(':roomId/enter')
  @ApiOperation({ summary: '用户端：进入直播间（含话术）' })
  @ApiOkResponse({ type: LiveRoomEnterResponseDto })
  enter(@Param('roomId') roomId: string) {
    return this.liveRoomService.enter(roomId);
  }

  @Get(':roomId')
  @ApiOperation({ summary: '直播间详情' })
  @ApiOkResponse({ type: LiveRoomDetailDto })
  getForAdmin(@Param('roomId') roomId: string) {
    return this.liveRoomService.getForAdmin(roomId);
  }

  @Put(':roomId')
  @ApiOperation({
    summary: '更新直播间',
    description: '话术整表替换：请求体中的 scripts 会完全覆盖原有话术。',
  })
  @ApiOkResponse({ type: LiveRoomDetailDto })
  update(@Param('roomId') roomId: string, @Body() dto: SaveLiveRoomDto) {
    return this.liveRoomService.update(roomId, dto);
  }

  @Delete(':roomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除直播间' })
  @ApiNoContentResponse()
  remove(@Param('roomId') roomId: string) {
    return this.liveRoomService.remove(roomId);
  }
}
