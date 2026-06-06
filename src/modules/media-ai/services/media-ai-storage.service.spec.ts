import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { MediaAiStorageService } from './media-ai-storage.service';

jest.mock('fs', () => ({
  ...jest.requireActual<typeof import('fs')>('fs'),
  promises: {
    ...jest.requireActual<typeof import('fs')>('fs').promises,
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    rm: jest.fn().mockResolvedValue(undefined),
    access: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn(),
  },
  createReadStream: jest.fn(),
}));

describe('MediaAiStorageService', () => {
  let service: MediaAiStorageService;
  const localRoot = path.join(os.tmpdir(), 'media-ai-storage-test');

  beforeEach(async () => {
    service = new MediaAiStorageService({
      get: jest.fn((key: string) => {
        const config: Record<string, string | number> = {
          'storage.localPath': localRoot,
          'storage.signedUrlTtl': 3600,
          'storage.signedUrlSecret': 'media-secret',
          'storage.publicBaseUrl': 'https://api.example.com/api',
          port: 3000,
        };
        return config[key];
      }),
    } as unknown as ConfigService);
    await service.onModuleInit();
  });

  it('buildInputKey / buildOutputKey 应生成正确路径', () => {
    expect(service.buildInputKey('u1', 'j1', 'in.mp4')).toBe(
      'u1/media-jobs/j1/input/in.mp4',
    );
    expect(service.buildOutputKey('u1', 'j1', 'out.mp4')).toBe(
      'u1/media-jobs/j1/output/out.mp4',
    );
  });

  it('buildClipOutputKey 应包含 clip 目录', () => {
    expect(service.buildClipOutputKey('u1', 'j1', 'c1', 'clip.mp4')).toBe(
      'u1/media-jobs/j1/output/clips/c1/clip.mp4',
    );
  });

  it('合法路径应落在 localRoot 下', () => {
    const abs = service.toAbsolutePath('user/jobs/j1/input.mp4');
    expect(abs.startsWith(localRoot)).toBe(true);
  });

  it('readJsonFile 应解析 JSON', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue('{"ok":true}');
    const data = await service.readJsonFile<{ ok: boolean }>('u1/manifest.json');
    expect(data.ok).toBe(true);
  });
});
