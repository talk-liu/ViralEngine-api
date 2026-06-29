import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
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
import { ApiErrorResponseDto } from '../../../common/dto/api-error.dto';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { ListNameAcquisitionRecordsQueryDto } from '../dto/list-name-acquisition-records-query.dto';
import {
  ClearNameAcquisitionRecordsResponseDto,
  NameAcquisitionRecordListResponseDto,
  SaveNameAcquisitionRecordsResponseDto,
} from '../dto/name-acquisition-response.dto';
import { SaveNameAcquisitionRecordsDto } from '../dto/save-name-acquisition-records.dto';
import { NameAcquisitionService } from '../services/name-acquisition.service';

@ApiTags('Name Acquisition')
@Controller('name-acquisition')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
export class NameAcquisitionController {
  constructor(
    private readonly nameAcquisitionService: NameAcquisitionService,
  ) {}

  @Get('records')
  @ApiOperation({ summary: '随机查询名称获客记录，可按地区筛选' })
  @ApiOkResponse({ type: NameAcquisitionRecordListResponseDto })
  listRecords(
    @CurrentUser() user: AuthUser,
    @Query() query: ListNameAcquisitionRecordsQueryDto,
  ) {
    return this.nameAcquisitionService.listRecords(user.id, query);
  }

  @Post('records')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '批量保存名称获客记录' })
  @ApiCreatedResponse({ type: SaveNameAcquisitionRecordsResponseDto })
  saveRecords(
    @CurrentUser() user: AuthUser,
    @Body() dto: SaveNameAcquisitionRecordsDto,
  ) {
    return this.nameAcquisitionService.saveRecords(user.id, dto);
  }

  @Delete('records')
  @ApiOperation({ summary: '清空当前账号的名称获客记录' })
  @ApiOkResponse({ type: ClearNameAcquisitionRecordsResponseDto })
  clearRecords(@CurrentUser() user: AuthUser) {
    return this.nameAcquisitionService.clearRecords(user.id);
  }
}
