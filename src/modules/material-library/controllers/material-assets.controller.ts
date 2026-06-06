import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { MaterialStorageService } from '../services/material-storage.service';

@ApiTags('Material Library Assets')
@Controller('material-assets')
export class MaterialAssetsController {
  constructor(private readonly storageService: MaterialStorageService) {}

  @Get('content')
  @ApiOperation({
    summary: '通过签名 URL 访问素材文件（无需 JWT）',
    description:
      '支持 HTTP Range 请求，供浏览器流式播放音视频；图片可直接预览。',
  })
  @ApiResponse({ status: 200 })
  async streamContent(
    @Query('key') key: string,
    @Query('expires') expiresRaw: string,
    @Query('sig') sig: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const expires = parseInt(expiresRaw, 10);
    this.storageService.verifySignedAccess(key, expires, sig);

    const rangeHeader = req.headers.range;
    const result = await this.storageService.openStreamWithRange(
      key,
      typeof rangeHeader === 'string' ? rangeHeader : undefined,
    );

    res.status(result.statusCode);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', result.contentLength);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(result.fileName)}"`,
    );
    if (result.contentRange) {
      res.setHeader('Content-Range', result.contentRange);
    }

    result.stream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).end();
        return;
      }
      res.destroy();
    });

    result.stream.pipe(res);
  }
}
