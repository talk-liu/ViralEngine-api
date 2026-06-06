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
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../../../common/dto/api-error.dto';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import {
  MaterialGroupListResponseDto,
  MaterialGroupSummaryDto,
} from '../dto/material-response.dto';
import { SaveMaterialGroupDto } from '../dto/save-material-group.dto';
import { MaterialGroupService } from '../services/material-group.service';

@ApiTags('Material Library')
@Controller('material-groups')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
export class MaterialGroupsController {
  constructor(private readonly groupService: MaterialGroupService) {}

  @Get()
  @ApiOperation({ summary: '素材分组列表' })
  @ApiOkResponse({ type: MaterialGroupListResponseDto })
  list(@CurrentUser() user: AuthUser) {
    return this.groupService.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: '创建素材分组' })
  @ApiCreatedResponse({ type: MaterialGroupSummaryDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: SaveMaterialGroupDto) {
    return this.groupService.create(user.id, dto);
  }

  @Put(':groupId')
  @ApiOperation({ summary: '更新素材分组' })
  @ApiOkResponse({ type: MaterialGroupSummaryDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Body() dto: SaveMaterialGroupDto,
  ) {
    return this.groupService.update(user.id, groupId, dto);
  }

  @Delete(':groupId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '删除素材分组',
    description: '删除后，该分组下的素材将自动取消分组关联，素材本身保留。',
  })
  @ApiNoContentResponse()
  remove(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
  ) {
    return this.groupService.remove(user.id, groupId);
  }
}
