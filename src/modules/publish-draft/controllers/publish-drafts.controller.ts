import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
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
import { PlatformId } from '../../platform/enums/platform-id.enum';
import { ListPublishDraftsQueryDto } from '../dto/list-publish-drafts-query.dto';
import {
  DraftCoverUploadResultDto,
  DraftVideoUploadResultDto,
  PublishDraftDetailDto,
  PublishDraftListResultDto,
} from '../dto/publish-draft-response.dto';
import { SavePublishDraftDto } from '../dto/save-publish-draft.dto';
import { PublishDraftService } from '../services/publish-draft.service';

@ApiTags('Publish Drafts')
@Controller('publish-drafts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
export class PublishDraftsController {
  constructor(private readonly publishDraftService: PublishDraftService) {}

  @Get()
  @ApiOperation({ summary: '草稿箱列表' })
  @ApiOkResponse({ type: PublishDraftListResultDto })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListPublishDraftsQueryDto,
  ) {
    return this.publishDraftService.list(user.id, query);
  }

  @Get(':draftId')
  @ApiOperation({ summary: '草稿详情' })
  @ApiOkResponse({ type: PublishDraftDetailDto })
  getDetail(
    @CurrentUser() user: AuthUser,
    @Param('draftId') draftId: string,
  ) {
    return this.publishDraftService.getDetail(user.id, draftId);
  }

  @Post()
  @ApiOperation({ summary: '创建草稿' })
  @ApiCreatedResponse({ type: PublishDraftDetailDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: SavePublishDraftDto) {
    return this.publishDraftService.create(user.id, dto);
  }

  @Put(':draftId')
  @ApiOperation({ summary: '更新草稿' })
  @ApiOkResponse({ type: PublishDraftDetailDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('draftId') draftId: string,
    @Body() dto: SavePublishDraftDto,
  ) {
    return this.publishDraftService.update(user.id, draftId, dto);
  }

  @Delete(':draftId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除草稿' })
  @ApiNoContentResponse()
  remove(
    @CurrentUser() user: AuthUser,
    @Param('draftId') draftId: string,
  ) {
    return this.publishDraftService.remove(user.id, draftId);
  }

  @Post(':draftId/video')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传或替换视频' })
  @ApiOkResponse({ type: DraftVideoUploadResultDto })
  uploadVideo(
    @CurrentUser() user: AuthUser,
    @Param('draftId') draftId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.publishDraftService.uploadVideo(user.id, draftId, file);
  }

  @Post(':draftId/platform-covers/:platformId')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传分平台封面' })
  @ApiOkResponse({ type: DraftCoverUploadResultDto })
  uploadPlatformCover(
    @CurrentUser() user: AuthUser,
    @Param('draftId') draftId: string,
    @Param('platformId', new ParseEnumPipe(PlatformId)) platformId: PlatformId,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.publishDraftService.uploadPlatformCover(
      user.id,
      draftId,
      platformId,
      file,
    );
  }

  @Delete(':draftId/platform-covers/:platformId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除分平台封面' })
  @ApiNoContentResponse()
  removePlatformCover(
    @CurrentUser() user: AuthUser,
    @Param('draftId') draftId: string,
    @Param('platformId', new ParseEnumPipe(PlatformId)) platformId: PlatformId,
  ) {
    return this.publishDraftService.removePlatformCover(
      user.id,
      draftId,
      platformId,
    );
  }
}
