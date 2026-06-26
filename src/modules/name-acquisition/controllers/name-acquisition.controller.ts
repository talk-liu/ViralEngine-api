import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../../../common/dto/api-error.dto';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { SaveNameAcquisitionRecordsResponseDto } from '../dto/name-acquisition-response.dto';
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
}
