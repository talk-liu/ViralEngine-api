import {
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { createReadStream, promises as fs } from 'fs';
import * as path from 'path';
import type { Readable } from 'stream';

@Injectable()
export class MaterialStorageService implements OnModuleInit {
  private localRoot = '';
  private signedUrlTtl = 3600;
  private signedUrlSecret = '';
  private publicBaseUrl = '';

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.localRoot = path.resolve(
      this.configService.get<string>('storage.localPath') ?? 'storage',
    );
    this.signedUrlTtl =
      this.configService.get<number>('storage.signedUrlTtl') ?? 3600;
    this.signedUrlSecret =
      this.configService.get<string>('storage.signedUrlSecret') ?? '';
    const configuredBase = this.configService.get<string>(
      'storage.publicBaseUrl',
    );
    const port = this.configService.get<number>('port') ?? 3000;
    this.publicBaseUrl =
      (configuredBase?.replace(/\/$/, '') ||
        `http://localhost:${port}/api`) + '/material-assets/content';

    await fs.mkdir(this.localRoot, { recursive: true });
  }

  buildStorageKey(
    userId: string,
    materialId: string,
    type: string,
    fileName: string,
  ): string {
    return path.posix.join(userId, 'materials', type, materialId, fileName);
  }

  async saveFile(storageKey: string, buffer: Buffer): Promise<void> {
    const absolutePath = this.toAbsolutePath(storageKey);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, buffer);
  }

  async deleteFile(storageKey: string | null | undefined): Promise<void> {
    if (!storageKey) {
      return;
    }
    const absolutePath = this.toAbsolutePath(storageKey);
    try {
      await fs.unlink(absolutePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  async removeMaterialDirectory(
    userId: string,
    materialId: string,
    type: string,
  ): Promise<void> {
    const dirKey = path.posix.join(userId, 'materials', type, materialId);
    const absolutePath = this.toAbsolutePath(dirKey);
    try {
      await fs.rm(absolutePath, { recursive: true, force: true });
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  getSignedUrl(storageKey: string): string {
    const expires = Math.floor(Date.now() / 1000) + this.signedUrlTtl;
    const signature = this.sign(storageKey, expires);
    const params = new URLSearchParams({
      key: storageKey,
      expires: String(expires),
      sig: signature,
    });
    return `${this.publicBaseUrl}?${params.toString()}`;
  }

  verifySignedAccess(
    storageKey: string,
    expires: number,
    signature: string,
  ): void {
    if (!storageKey || !signature || !expires) {
      throw new UnauthorizedException('签名无效');
    }
    if (expires < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('签名已过期');
    }
    const expected = this.sign(storageKey, expires);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('签名无效');
    }
  }

  async openStreamWithRange(
    storageKey: string,
    rangeHeader?: string,
  ): Promise<{
    statusCode: 200 | 206;
    stream: Readable;
    mimeType: string;
    fileName: string;
    contentLength: number;
    contentRange?: string;
  }> {
    const file = await this.resolveReadableFile(storageKey);

    if (!rangeHeader?.startsWith('bytes=')) {
      return {
        statusCode: 200,
        stream: createReadStream(file.absolutePath),
        mimeType: file.mimeType,
        fileName: file.fileName,
        contentLength: file.size,
      };
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!match) {
      return {
        statusCode: 200,
        stream: createReadStream(file.absolutePath),
        mimeType: file.mimeType,
        fileName: file.fileName,
        contentLength: file.size,
      };
    }

    const fileSize = file.size;
    let start = match[1] ? parseInt(match[1], 10) : 0;
    let end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

    if (Number.isNaN(start) || start < 0 || start >= fileSize) {
      start = 0;
      end = Math.min(fileSize - 1, end);
    }
    end = Math.min(end, fileSize - 1);
    if (end < start) {
      end = start;
    }

    const contentLength = end - start + 1;
    return {
      statusCode: 206,
      stream: createReadStream(file.absolutePath, { start, end }),
      mimeType: file.mimeType,
      fileName: file.fileName,
      contentLength,
      contentRange: `bytes ${start}-${end}/${fileSize}`,
    };
  }

  private async resolveReadableFile(storageKey: string): Promise<{
    absolutePath: string;
    mimeType: string;
    fileName: string;
    size: number;
  }> {
    const absolutePath = this.toAbsolutePath(storageKey);
    let stat;
    try {
      stat = await fs.stat(absolutePath);
    } catch {
      throw new NotFoundException('文件不存在');
    }
    const fileName = path.basename(storageKey);
    return {
      absolutePath,
      mimeType: this.guessMimeType(fileName),
      fileName,
      size: stat.size,
    };
  }

  private sign(storageKey: string, expires: number): string {
    return createHmac('sha256', this.signedUrlSecret)
      .update(`${storageKey}:${expires}`)
      .digest('hex');
  }

  private toAbsolutePath(storageKey: string): string {
    const normalized = path
      .normalize(storageKey)
      .replace(/^(\.\.(\/|\\|$))+/, '');
    if (normalized.includes('..')) {
      throw new UnauthorizedException('非法存储路径');
    }
    return path.join(this.localRoot, normalized);
  }

  private guessMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const map: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.webm': 'video/webm',
      '.avi': 'video/x-msvideo',
      '.ts': 'video/mp2t',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.flac': 'audio/flac',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
    };
    return map[ext] ?? 'application/octet-stream';
  }
}
