import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { MaterialStorageService } from './material-storage.service';

jest.mock('fs', () => ({
  ...jest.requireActual<typeof import('fs')>('fs'),
  promises: {
    ...jest.requireActual<typeof import('fs')>('fs').promises,
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    rm: jest.fn().mockResolvedValue(undefined),
  },
  createReadStream: jest.fn(),
}));

describe('MaterialStorageService', () => {
  let service: MaterialStorageService;
  const secret = 'test-secret';
  const localRoot = path.join(os.tmpdir(), 'material-storage-test');

  beforeEach(async () => {
    const configService = {
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
    };

    service = new MaterialStorageService(
      configService as unknown as ConfigService,
    );
    await service.onModuleInit();
  });

  describe('buildStorageKey', () => {
    it('应生成 POSIX 风格存储路径', () => {
      expect(
        service.buildStorageKey('user-1', 'mat-1', 'image', 'photo.png'),
      ).toBe('user-1/materials/image/mat-1/photo.png');
    });
  });

  describe('getSignedUrl / verifySignedAccess', () => {
    it('应生成可验证的签名 URL', () => {
      const storageKey = 'user-1/materials/image/mat-1/photo.png';
      const url = service.getSignedUrl(storageKey);

      expect(url).toContain('https://api.example.com/api/material-assets/content?');
      const params = new URL(url).searchParams;
      const key = params.get('key');
      const expires = Number(params.get('expires'));
      const sig = params.get('sig');

      expect(key).toBe(storageKey);
      expect(expires).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(() =>
        service.verifySignedAccess(storageKey, expires, sig!),
      ).not.toThrow();
    });

    it('签名不匹配时应抛出 UnauthorizedException', () => {
      const storageKey = 'user-1/materials/image/mat-1/photo.png';
      const expires = Math.floor(Date.now() / 1000) + 3600;

      expect(() =>
        service.verifySignedAccess(storageKey, expires, 'invalid-signature'),
      ).toThrow(UnauthorizedException);
    });

    it('签名过期时应抛出 UnauthorizedException', () => {
      const storageKey = 'user-1/materials/image/mat-1/photo.png';
      const expires = Math.floor(Date.now() / 1000) - 10;
      const sig = createHmac('sha256', secret)
        .update(`${storageKey}:${expires}`)
        .digest('hex');

      expect(() =>
        service.verifySignedAccess(storageKey, expires, sig),
      ).toThrow(UnauthorizedException);
    });
  });

  describe('saveFile', () => {
    it('应写入文件到本地目录', async () => {
      const storageKey = 'user-1/materials/image/mat-1/photo.png';
      const buffer = Buffer.from('hello');

      await service.saveFile(storageKey, buffer);

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(localRoot, storageKey),
        buffer,
      );
    });
  });

  describe('deleteFile', () => {
    it('storageKey 为空时应跳过', async () => {
      await service.deleteFile(null);
      expect(fs.unlink).not.toHaveBeenCalled();
    });
  });
});
