import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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
import { CreateSubtitleJobDto } from '../dto/create-subtitle-job.dto';
import { CreateWatermarkJobDto } from '../dto/create-watermark-job.dto';
import { MediaJobResponseDto } from '../dto/media-job-response.dto';
import { MediaAiService } from '../services/media-ai.service';

@ApiTags('Media AI')
@Controller('media-ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
export class MediaAiController {
  constructor(private readonly mediaAiService: MediaAiService) {}

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
}
