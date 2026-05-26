import {
  Controller,
  Get,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { MediaAiStorageService } from '../services/media-ai-storage.service';

@ApiTags('Media AI Assets')
@Controller('media-ai/assets')
export class MediaAiAssetsController {
  constructor(private readonly storageService: MediaAiStorageService) {}

  @Get('content')
  @ApiOperation({
    summary: '通过签名 URL 访问媒体任务文件（无需 JWT）',
  })
  async streamContent(
    @Query('key') key: string,
    @Query('expires') expiresRaw: string,
    @Query('sig') sig: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const expires = parseInt(expiresRaw, 10);
    this.storageService.verifySignedAccess(key, expires, sig);

    const { stream, mimeType, fileName } =
      await this.storageService.openReadStream(key);

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(fileName)}"`,
    );

    return new StreamableFile(stream);
  }
}
