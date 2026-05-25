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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { BindCompleteDto, BindStartDto } from '../dto/bind.dto';
import {
  AccountNetworkDto,
  BindSessionResponseDto,
  BindStartResponseDto,
  BoundAccountDto,
  NetworkTestResultDto,
  PlatformAccountViewDto,
  TokenRefreshResponseDto,
} from '../dto/platform.dto';
import { UpsertAccountNetworkDto } from '../dto/network.dto';
import { PlatformId } from '../enums/platform-id.enum';
import { PlatformNetworkService } from '../services/platform-network.service';
import { PlatformService } from '../services/platform.service';

@ApiTags('Platform Accounts')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
export class PlatformsController {
  constructor(
    private readonly platformService: PlatformService,
    private readonly networkService: PlatformNetworkService,
  ) {}

  @Get('platforms')
  @ApiOperation({ summary: '平台列表（含当前用户绑定状态）' })
  @ApiOkResponse({ type: [PlatformAccountViewDto] })
  listPlatforms(@CurrentUser() user: AuthUser) {
    return this.platformService.listPlatforms(user.id);
  }

  @Post('platforms/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '取消进行中的绑定并刷新列表' })
  @ApiOkResponse({ type: [PlatformAccountViewDto] })
  refreshPlatforms(@CurrentUser() user: AuthUser) {
    return this.platformService.refreshPlatforms(user.id);
  }

  @Post('platforms/:platformId/bind/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发起 OAuth 绑定' })
  @ApiOkResponse({ type: BindStartResponseDto })
  startBind(
    @CurrentUser() user: AuthUser,
    @Param('platformId', new ParseEnumPipe(PlatformId)) platformId: PlatformId,
    @Body() _dto: BindStartDto,
  ) {
    return this.platformService.startBind(user.id, platformId);
  }

  @Get('platforms/bind-sessions/:bindSessionId')
  @ApiOperation({ summary: '轮询绑定结果' })
  @ApiOkResponse({ type: BindSessionResponseDto })
  getBindSession(
    @CurrentUser() user: AuthUser,
    @Param('bindSessionId') bindSessionId: string,
  ) {
    return this.platformService.getBindSession(user.id, bindSessionId);
  }

  @Post('platforms/:platformId/bind/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '使用 authorization code 完成绑定' })
  @ApiOkResponse({ type: BoundAccountDto })
  completeBind(
    @CurrentUser() user: AuthUser,
    @Param('platformId', new ParseEnumPipe(PlatformId)) platformId: PlatformId,
    @Body() dto: BindCompleteDto,
  ) {
    return this.platformService.completeBindWithCode(
      user.id,
      platformId,
      dto.code,
      dto.bindSessionId,
    );
  }

  @Delete('platform-accounts/:accountId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '解绑平台账号' })
  @ApiNoContentResponse()
  unbindAccount(
    @CurrentUser() user: AuthUser,
    @Param('accountId') accountId: string,
  ) {
    return this.platformService.unbindAccount(user.id, accountId);
  }

  @Post('platform-accounts/:accountId/token/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新平台 Token' })
  @ApiOkResponse({ type: TokenRefreshResponseDto })
  refreshToken(
    @CurrentUser() user: AuthUser,
    @Param('accountId') accountId: string,
  ) {
    return this.platformService.refreshAccountToken(user.id, accountId);
  }

  @Get('platform-accounts/:accountId/network')
  @ApiOperation({ summary: '获取账号网络配置' })
  @ApiOkResponse({ type: AccountNetworkDto })
  getNetwork(
    @CurrentUser() user: AuthUser,
    @Param('accountId') accountId: string,
  ) {
    return this.networkService.getNetwork(user.id, accountId);
  }

  @Put('platform-accounts/:accountId/network')
  @ApiOperation({ summary: '更新账号网络配置' })
  @ApiOkResponse({ type: AccountNetworkDto })
  upsertNetwork(
    @CurrentUser() user: AuthUser,
    @Param('accountId') accountId: string,
    @Body() dto: UpsertAccountNetworkDto,
  ) {
    return this.networkService.upsertNetwork(user.id, accountId, dto);
  }

  @Post('platform-accounts/:accountId/network/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '测试账号网络配置' })
  @ApiOkResponse({ type: NetworkTestResultDto })
  testNetwork(
    @CurrentUser() user: AuthUser,
    @Param('accountId') accountId: string,
    @Body() dto: UpsertAccountNetworkDto,
  ) {
    return this.networkService.testNetwork(user.id, accountId, dto);
  }
}
