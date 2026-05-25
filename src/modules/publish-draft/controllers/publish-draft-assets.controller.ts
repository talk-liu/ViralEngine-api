import {
  Controller,
  Get,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PublishDraftStorageService } from '../services/publish-draft-storage.service';

@ApiTags('Publish Draft Assets')
@Controller('publish-draft-assets')
export class PublishDraftAssetsController {
  constructor(private readonly storageService: PublishDraftStorageService) {}

  @Get('content')
  @ApiOperation({
    summary: '通过签名 URL 访问草稿素材（无需 JWT）',
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
