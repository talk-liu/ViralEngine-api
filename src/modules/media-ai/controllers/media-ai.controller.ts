import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
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
import { CreateFlashHeadJobDto } from '../dto/create-flashhead-job.dto';
import { CreateLatentSyncJobDto } from '../dto/create-latentsync-job.dto';
import { CreateLiveSliceJobDto } from '../dto/create-live-slice-job.dto';
import { CreateSubtitleJobDto } from '../dto/create-subtitle-job.dto';
import { CreateTtsJobDto } from '../dto/create-tts-job.dto';
import { CreateWatermarkJobDto } from '../dto/create-watermark-job.dto';
import {
  buildFlashHeadParamsSchema,
  FlashHeadParamsSchemaDto,
} from '../dto/flashhead-params-schema.dto';
import {
  buildLatentSyncParamsSchema,
  LatentSyncParamsSchemaDto,
} from '../dto/latentsync-params-schema.dto';
import {
  buildIndexTts2ParamsSchema,
  IndexTts2ParamsSchemaDto,
} from '../dto/indextts2-params-schema.dto';
import { ListMediaJobsQueryDto } from '../dto/list-media-jobs-query.dto';
import { MediaJobListResponseDto } from '../dto/media-job-list-response.dto';
import { MediaJobResponseDto } from '../dto/media-job-response.dto';
import { MediaAiService } from '../services/media-ai.service';

@ApiTags('Media AI')
@Controller('media-ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
export class MediaAiController {
  constructor(private readonly mediaAiService: MediaAiService) {}

  @Get('jobs')
  @ApiOperation({
    summary: '任务中心：列出当前用户的媒体处理任务',
    description:
      '返回全部状态（pending / processing / completed / failed）。列表不含 live_slice manifest，详情请调 GET jobs/:jobId。',
  })
  @ApiOkResponse({ type: MediaJobListResponseDto })
  listJobs(
    @CurrentUser() user: AuthUser,
    @Query() query: ListMediaJobsQueryDto,
  ) {
    return this.mediaAiService.listJobs(user.id, query);
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: '查询媒体处理任务状态' })
  @ApiOkResponse({ type: MediaJobResponseDto })
  getJob(
    @CurrentUser() user: AuthUser,
    @Param('jobId') jobId: string,
  ) {
    return this.mediaAiService.getJob(user.id, jobId);
  }

  @Delete('jobs/:jobId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '删除媒体处理任务及文件',
    description:
      '前端下载完字幕后可调用，立即释放存储。未调用时，产出文件在任务完成后默认保留 12 小时由服务端自动清理。',
  })
  @ApiNoContentResponse()
  removeJob(
    @CurrentUser() user: AuthUser,
    @Param('jobId') jobId: string,
  ) {
    return this.mediaAiService.removeJob(user.id, jobId);
  }

  @Post('jobs/watermark')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '创建视频加水印任务' })
  @ApiCreatedResponse({ type: MediaJobResponseDto })
  createWatermarkJob(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateWatermarkJobDto,
  ) {
    return this.mediaAiService.createWatermarkJob(user.id, file, dto);
  }

  @Post('jobs/subtitle')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '创建视频字幕识别任务' })
  @ApiCreatedResponse({ type: MediaJobResponseDto })
  createSubtitleJob(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateSubtitleJobDto,
  ) {
    return this.mediaAiService.createSubtitleJob(user.id, file, dto);
  }

  @Post('jobs/live-slice')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '创建直播切片任务',
    description:
      '上传长直播录像，自动识别卖货高光片段并输出竖屏切片、封面与字幕。完成后通过 manifest 获取各切片下载地址。',
  })
  @ApiCreatedResponse({ type: MediaJobResponseDto })
  createLiveSliceJob(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateLiveSliceJobDto,
  ) {
    return this.mediaAiService.createLiveSliceJob(user.id, file, dto);
  }

  @Get('tts/params')
  @ApiOperation({
    summary: 'IndexTTS2 推理参数说明',
    description:
      '返回前端表单可用的字段名、默认值、取值范围与 multipart 文件字段名（spkFile / emoFile）。',
  })
  @ApiOkResponse({ type: IndexTts2ParamsSchemaDto })
  getIndexTts2Params(): IndexTts2ParamsSchemaDto {
    return buildIndexTts2ParamsSchema();
  }

  @Post('jobs/tts')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'spkFile', maxCount: 1 },
      { name: 'emoFile', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '创建 IndexTTS2 语音合成任务',
    description:
      '上传音色参考音频 spkFile，按 text 与情感/采样参数合成 WAV。emoControlMethod=1 时需上传 emoFile。',
  })
  @ApiCreatedResponse({ type: MediaJobResponseDto })
  createTtsJob(
    @CurrentUser() user: AuthUser,
    @UploadedFiles()
    files: {
      spkFile?: Express.Multer.File[];
      emoFile?: Express.Multer.File[];
    },
    @Body() dto: CreateTtsJobDto,
  ) {
    const spkFile = files?.spkFile?.[0];
    const emoFile = files?.emoFile?.[0];
    if (!spkFile) {
      throw new BadRequestException('请上传音色参考音频 spkFile');
    }
    return this.mediaAiService.createTtsJob(user.id, spkFile, emoFile, dto);
  }

  @Get('flashhead/params')
  @ApiOperation({
    summary: 'FlashHead Pro 推理参数说明',
    description:
      '返回前端表单可用的字段名、默认值与 multipart 文件字段名（portraitFile / audioFile）。',
  })
  @ApiOkResponse({ type: FlashHeadParamsSchemaDto })
  getFlashHeadParams(): FlashHeadParamsSchemaDto {
    return buildFlashHeadParamsSchema();
  }

  @Post('jobs/flashhead')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'portraitFile', maxCount: 1 },
      { name: 'audioFile', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '创建 FlashHead Pro 口播数字人任务',
    description:
      '上传人像参考图 portraitFile 与驱动音频 audioFile，生成对口型口播视频 MP4。',
  })
  @ApiCreatedResponse({ type: MediaJobResponseDto })
  createFlashHeadJob(
    @CurrentUser() user: AuthUser,
    @UploadedFiles()
    files: {
      portraitFile?: Express.Multer.File[];
      audioFile?: Express.Multer.File[];
    },
    @Body() dto: CreateFlashHeadJobDto,
  ) {
    const portraitFile = files?.portraitFile?.[0];
    const audioFile = files?.audioFile?.[0];
    if (!portraitFile) {
      throw new BadRequestException('请上传人像参考图 portraitFile');
    }
    if (!audioFile) {
      throw new BadRequestException('请上传驱动音频 audioFile');
    }
    return this.mediaAiService.createFlashHeadJob(
      user.id,
      portraitFile,
      audioFile,
      dto,
    );
  }

  @Get('latentsync/params')
  @ApiOperation({
    summary: 'LatentSync 推理参数说明',
    description:
      '返回前端表单可用的字段名、默认值与 multipart 文件字段名（videoFile / audioFile）。',
  })
  @ApiOkResponse({ type: LatentSyncParamsSchemaDto })
  getLatentSyncParams(): LatentSyncParamsSchemaDto {
    return buildLatentSyncParamsSchema();
  }

  @Post('jobs/latentsync')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'videoFile', maxCount: 1 },
      { name: 'audioFile', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '创建 LatentSync 视频对口型任务',
    description:
      '上传源视频 videoFile 与驱动音频 audioFile，生成口型同步后的 MP4。',
  })
  @ApiCreatedResponse({ type: MediaJobResponseDto })
  createLatentSyncJob(
    @CurrentUser() user: AuthUser,
    @UploadedFiles()
    files: {
      videoFile?: Express.Multer.File[];
      audioFile?: Express.Multer.File[];
    },
    @Body() dto: CreateLatentSyncJobDto,
  ) {
    const videoFile = files?.videoFile?.[0];
    const audioFile = files?.audioFile?.[0];
    if (!videoFile) {
      throw new BadRequestException('请上传源视频 videoFile');
    }
    if (!audioFile) {
      throw new BadRequestException('请上传驱动音频 audioFile');
    }
    return this.mediaAiService.createLatentSyncJob(
      user.id,
      videoFile,
      audioFile,
      dto,
    );
  }
}
