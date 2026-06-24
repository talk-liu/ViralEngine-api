import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppReleaseResponseDto } from '../dto/app-release-response.dto';

@ApiTags('App')
@Controller('app')
export class AppReleaseController {
  constructor(private readonly configService: ConfigService) {}

  @Get('release')
  @ApiOperation({
    summary: '桌面客户端最新版本',
    description: '返回最新可下载版本与下载地址，无需登录',
  })
  @ApiOkResponse({ type: AppReleaseResponseDto })
  getRelease(): AppReleaseResponseDto {
    const releaseNotes =
      this.configService.get<string>('appRelease.releaseNotes')?.trim() ?? '';

    return {
      latestVersion:
        this.configService.get<string>('appRelease.latestVersion')?.trim() ??
        '1.0.0',
      downloadUrl:
        this.configService.get<string>('appRelease.downloadUrl')?.trim() ?? '',
      releaseNotes: releaseNotes || undefined,
      forceUpdate:
        this.configService.get<boolean>('appRelease.forceUpdate') ?? false,
    };
  }
}
