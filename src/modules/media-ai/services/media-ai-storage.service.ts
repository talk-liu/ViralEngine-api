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
export class MediaAiStorageService implements OnModuleInit {
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
    const configuredBase = this.configService.get<string>('storage.publicBaseUrl');
    const port = this.configService.get<number>('port') ?? 3000;
    this.publicBaseUrl =
      (configuredBase?.replace(/\/$/, '') ||
        `http://localhost:${port}/api`) + '/media-ai/assets/content';

    await fs.mkdir(this.localRoot, { recursive: true });
  }

  buildInputKey(userId: string, jobId: string, fileName: string): string {
    return path.posix.join(userId, 'media-jobs', jobId, 'input', fileName);
  }

  buildOutputKey(userId: string, jobId: string, fileName: string): string {
    return path.posix.join(userId, 'media-jobs', jobId, 'output', fileName);
  }

  buildClipOutputKey(
    userId: string,
    jobId: string,
    clipId: string,
    fileName: string,
  ): string {
    return path.posix.join(
      userId,
      'media-jobs',
      jobId,
      'output',
      'clips',
      clipId,
      fileName,
    );
  }

  async readJsonFile<T>(storageKey: string): Promise<T> {
    const absolutePath = this.toAbsolutePath(storageKey);
    try {
      await fs.access(absolutePath);
    } catch {
      throw new NotFoundException('文件不存在');
    }
    const raw = await fs.readFile(absolutePath, 'utf-8');
    return JSON.parse(raw) as T;
  }

  toAbsolutePath(storageKey: string): string {
    const normalized = path.normalize(storageKey).replace(/^(\.\.(\/|\\|$))+/, '');
    if (normalized.includes('..')) {
      throw new UnauthorizedException('非法存储路径');
    }
    return path.join(this.localRoot, normalized);
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

  buildJobDirectory(userId: string, jobId: string): string {
    return path.posix.join(userId, 'media-jobs', jobId);
  }

  async removeJobDirectory(userId: string, jobId: string): Promise<void> {
    const absolutePath = this.toAbsolutePath(
      this.buildJobDirectory(userId, jobId),
    );
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

  async openReadStream(storageKey: string): Promise<{
    stream: Readable;
    mimeType: string;
    fileName: string;
  }> {
    const absolutePath = this.toAbsolutePath(storageKey);
    try {
      await fs.access(absolutePath);
    } catch {
      throw new NotFoundException('文件不存在');
    }
    const fileName = path.basename(storageKey);
    return {
      stream: createReadStream(absolutePath),
      mimeType: this.guessMimeType(fileName),
      fileName,
    };
  }

  private sign(storageKey: string, expires: number): string {
    return createHmac('sha256', this.signedUrlSecret)
      .update(`${storageKey}:${expires}`)
      .digest('hex');
  }

  private guessMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const map: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.webm': 'video/webm',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.srt': 'application/x-subrip',
      '.vtt': 'text/vtt',
      '.json': 'application/json',
    };
    return map[ext] ?? 'application/octet-stream';
  }
}
