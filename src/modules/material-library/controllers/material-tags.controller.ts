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
  MaterialTagDetailDto,
  MaterialTagListResponseDto,
} from '../dto/material-response.dto';
import { SaveMaterialTagDto } from '../dto/save-material-tag.dto';
import { MaterialTagService } from '../services/material-tag.service';

@ApiTags('Material Library')
@Controller('material-tags')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
export class MaterialTagsController {
  constructor(private readonly tagService: MaterialTagService) {}

  @Get()
  @ApiOperation({ summary: '素材标签列表' })
  @ApiOkResponse({ type: MaterialTagListResponseDto })
  list(@CurrentUser() user: AuthUser) {
    return this.tagService.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: '创建素材标签' })
  @ApiCreatedResponse({ type: MaterialTagDetailDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: SaveMaterialTagDto) {
    return this.tagService.create(user.id, dto);
  }

  @Put(':tagId')
  @ApiOperation({ summary: '更新素材标签' })
  @ApiOkResponse({ type: MaterialTagDetailDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('tagId') tagId: string,
    @Body() dto: SaveMaterialTagDto,
  ) {
    return this.tagService.update(user.id, tagId, dto);
  }

  @Delete(':tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '删除素材标签',
    description: '删除后，素材与标签的关联关系将自动移除，素材本身保留。',
  })
  @ApiNoContentResponse()
  remove(@CurrentUser() user: AuthUser, @Param('tagId') tagId: string) {
    return this.tagService.remove(user.id, tagId);
  }
}
