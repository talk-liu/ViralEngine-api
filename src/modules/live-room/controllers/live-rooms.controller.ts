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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../../../common/dto/api-error.dto';
import { AdminGuard } from '../../../auth/guards/admin.guard';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import {
  LiveRoomDetailDto,
  LiveRoomEnterResponseDto,
  LiveRoomListResponseDto,
  LiveRoomPublicListResponseDto,
} from '../dto/live-room-response.dto';
import { SaveLiveRoomDto } from '../dto/save-live-room.dto';
import { LiveRoomService } from '../services/live-room.service';

@ApiTags('Live Room')
@Controller('live-rooms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
export class LiveRoomsController {
  constructor(private readonly liveRoomService: LiveRoomService) {}

  @Get('public')
  @ApiOperation({ summary: '用户端：直播间列表（含话术）' })
  @ApiOkResponse({ type: LiveRoomPublicListResponseDto })
  listPublic() {
    return this.liveRoomService.listPublic();
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '管理员：直播间列表' })
  @ApiOkResponse({ type: LiveRoomListResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto, description: '非管理员' })
  listForAdmin() {
    return this.liveRoomService.listForAdmin();
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '管理员：创建直播间' })
  @ApiCreatedResponse({ type: LiveRoomDetailDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto, description: '非管理员' })
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
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '管理员：直播间详情' })
  @ApiOkResponse({ type: LiveRoomDetailDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto, description: '非管理员' })
  getForAdmin(@Param('roomId') roomId: string) {
    return this.liveRoomService.getForAdmin(roomId);
  }

  @Put(':roomId')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: '管理员：更新直播间',
    description: '话术整表替换：请求体中的 scripts 会完全覆盖原有话术。',
  })
  @ApiOkResponse({ type: LiveRoomDetailDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto, description: '非管理员' })
  update(@Param('roomId') roomId: string, @Body() dto: SaveLiveRoomDto) {
    return this.liveRoomService.update(roomId, dto);
  }

  @Delete(':roomId')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '管理员：删除直播间' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ type: ApiErrorResponseDto, description: '非管理员' })
  remove(@Param('roomId') roomId: string) {
    return this.liveRoomService.remove(roomId);
  }
}
