import { Controller, Get, Param, ParseEnumPipe, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PlatformId } from '../enums/platform-id.enum';
import { PlatformService } from '../services/platform.service';

@ApiTags('OAuth')
@Controller('oauth')
export class OAuthController {
  constructor(private readonly platformService: PlatformService) {}

  @Get(':platformId/callback')
  @ApiOperation({ summary: 'OAuth 回调（浏览器跳转，无需 JWT）' })
  async callback(
    @Param('platformId', new ParseEnumPipe(PlatformId)) platformId: PlatformId,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Res() res: Response,
  ) {
    const html = await this.platformService.handleOAuthCallback(platformId, {
      code,
      state,
      error,
      error_description: errorDescription,
    });

    res.status(200).type('html').send(html);
  }
}
