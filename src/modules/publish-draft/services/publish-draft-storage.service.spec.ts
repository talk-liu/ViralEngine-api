import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PublishDraftStorageService } from './publish-draft-storage.service';

jest.mock('fs', () => ({
  ...jest.requireActual<typeof import('fs')>('fs'),
  promises: {
    ...jest.requireActual<typeof import('fs')>('fs').promises,
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
  },
  createReadStream: jest.fn(),
}));

describe('PublishDraftStorageService', () => {
  let service: PublishDraftStorageService;
  const secret = 'draft-secret';
  const localRoot = path.join(os.tmpdir(), 'publish-draft-storage-test');

  beforeEach(async () => {
    service = new PublishDraftStorageService({
      get: jest.fn((key: string) => {
        const config: Record<string, string | number> = {
          'storage.localPath': localRoot,
          'storage.signedUrlTtl': 3600,
          'storage.signedUrlSecret': secret,
          'storage.publicBaseUrl': 'https://api.example.com/api',
          port: 3000,
        };
        return config[key];
      }),
    } as unknown as ConfigService);
    await service.onModuleInit();
  });

  it('buildStorageKey 应生成 POSIX 路径', () => {
    expect(service.buildStorageKey('u1', 'd1', 'video', 'file.mp4')).toBe(
      'u1/d1/video/file.mp4',
    );
  });

  it('getSignedUrl 应可验证', () => {
    const key = 'u1/d1/video/file.mp4';
    const url = service.getSignedUrl(key);
    const params = new URL(url).searchParams;

    expect(() =>
      service.verifySignedAccess(
        key,
        Number(params.get('expires')),
        params.get('sig')!,
      ),
    ).not.toThrow();
  });

  it('过期签名应拒绝', () => {
    const key = 'u1/d1/video/file.mp4';
    const expires = Math.floor(Date.now() / 1000) - 10;
    const sig = createHmac('sha256', secret)
      .update(`${key}:${expires}`)
      .digest('hex');

    expect(() => service.verifySignedAccess(key, expires, sig)).toThrow(
      UnauthorizedException,
    );
  });

  it('saveFile 应写入磁盘', async () => {
    const buffer = Buffer.from('data');
    const meta = await service.saveFile('u1/d1/video/f.mp4', buffer, 'video/mp4', 'f.mp4');
    expect(meta.fileSize).toBe(buffer.length);
    expect(fs.writeFile).toHaveBeenCalled();
  });
});
