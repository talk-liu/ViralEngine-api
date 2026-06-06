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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
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
import { ListMaterialsQueryDto } from '../dto/list-materials-query.dto';
import {
  MaterialDetailDto,
  MaterialListResponseDto,
} from '../dto/material-response.dto';
import { UpdateMaterialDto } from '../dto/update-material.dto';
import { UploadMaterialDto } from '../dto/upload-material.dto';
import { MaterialService } from '../services/material.service';

@ApiTags('Material Library')
@Controller('materials')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
export class MaterialsController {
  constructor(private readonly materialService: MaterialService) {}

  @Get()
  @ApiOperation({ summary: '素材列表' })
  @ApiOkResponse({ type: MaterialListResponseDto })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListMaterialsQueryDto,
  ) {
    return this.materialService.list(user.id, query);
  }

  @Get(':materialId')
  @ApiOperation({ summary: '素材详情' })
  @ApiOkResponse({ type: MaterialDetailDto })
  getDetail(
    @CurrentUser() user: AuthUser,
    @Param('materialId') materialId: string,
  ) {
    return this.materialService.getDetail(user.id, materialId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '上传素材',
    description:
      '支持图片、音频、视频；分组与标签均为可选关联，可不传或只传其中一种。',
  })
  @ApiCreatedResponse({ type: MaterialDetailDto })
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMaterialDto,
  ) {
    return this.materialService.upload(user.id, file, dto);
  }

  @Put(':materialId')
  @ApiOperation({
    summary: '更新素材元数据',
    description: '可修改名称、分组、标签；不支持替换文件内容。',
  })
  @ApiOkResponse({ type: MaterialDetailDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('materialId') materialId: string,
    @Body() dto: UpdateMaterialDto,
  ) {
    return this.materialService.update(user.id, materialId, dto);
  }

  @Delete(':materialId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除素材' })
  @ApiNoContentResponse()
  remove(
    @CurrentUser() user: AuthUser,
    @Param('materialId') materialId: string,
  ) {
    return this.materialService.remove(user.id, materialId);
  }
}
