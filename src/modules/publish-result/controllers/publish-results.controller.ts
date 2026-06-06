import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiErrorResponseDto } from '../../../common/dto/api-error.dto';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { ListPublishResultsQueryDto } from '../dto/list-publish-results-query.dto';
import {
  PublishResultDetailDto,
  PublishResultListResponseDto,
  SubmitPublishResultResponseDto,
} from '../dto/publish-result-response.dto';
import { SubmitPublishResultDto } from '../dto/submit-publish-result.dto';
import { PublishResultService } from '../services/publish-result.service';

@ApiTags('Publish Results')
@Controller('publish-results')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
export class PublishResultsController {
  constructor(private readonly publishResultService: PublishResultService) {}

  @Post()
  @ApiOperation({ summary: '上报发布批次结果' })
  @ApiCreatedResponse({ type: SubmitPublishResultResponseDto })
  @ApiOkResponse({
    type: SubmitPublishResultResponseDto,
    description: '幂等命中，返回已有记录',
  })
  async submit(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitPublishResultDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { result, created } = await this.publishResultService.submit(
      user.id,
      dto,
    );
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return result;
  }

  @Get()
  @ApiOperation({ summary: '发布列表' })
  @ApiOkResponse({ type: PublishResultListResponseDto })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListPublishResultsQueryDto,
  ) {
    return this.publishResultService.list(user.id, query);
  }

  @Get(':batchId')
  @ApiOperation({ summary: '发布批次详情' })
  @ApiOkResponse({ type: PublishResultDetailDto })
  getDetail(
    @CurrentUser() user: AuthUser,
    @Param('batchId') batchId: string,
  ) {
    return this.publishResultService.getDetail(user.id, batchId);
  }
}
