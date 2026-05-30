import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompleteMediaJobDto } from '../dto/complete-media-job.dto';
import { UpdateMediaJobProgressDto } from '../dto/update-media-job-progress.dto';
import { MediaWorkerGuard } from '../guards/media-worker.guard';
import { MediaAiService } from '../services/media-ai.service';

@ApiTags('Media AI Internal')
@Controller('media-ai/internal')
@UseGuards(MediaWorkerGuard)
@ApiHeader({ name: 'X-Worker-Secret', required: true })
export class MediaAiInternalController {
  constructor(private readonly mediaAiService: MediaAiService) {}

  @Patch('jobs/:jobId/processing')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Worker：标记任务开始处理' })
  @ApiNoContentResponse()
  markProcessing(@Param('jobId') jobId: string) {
    return this.mediaAiService.markProcessing(jobId);
  }

  @Patch('jobs/:jobId/progress')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Worker：上报任务进度' })
  @ApiNoContentResponse()
  updateProgress(
    @Param('jobId') jobId: string,
    @Body() dto: UpdateMediaJobProgressDto,
  ) {
    return this.mediaAiService.updateProgress(jobId, dto.progress);
  }

  @Post('jobs/:jobId/complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Worker：上报任务完成或失败' })
  @ApiNoContentResponse()
  completeJob(
    @Param('jobId') jobId: string,
    @Body() dto: CompleteMediaJobDto,
  ) {
    return this.mediaAiService.completeJob(jobId, dto);
  }
}
