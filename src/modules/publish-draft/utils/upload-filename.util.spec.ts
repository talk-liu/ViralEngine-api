import { buildUniqueFileName } from './upload-filename.util';

describe('buildUniqueFileName', () => {
  it('应优先使用原始文件名扩展名', () => {
    const name = buildUniqueFileName('video', 'image/png', 'clip.MP4');
    expect(name).toMatch(/^video-\d+-[a-z0-9]+\.mp4$/);
  });

  it('无有效扩展名时应回退到 MIME 映射', () => {
    const name = buildUniqueFileName('cover', 'image/jpeg', 'noext');
    expect(name).toMatch(/^cover-\d+-[a-z0-9]+\.jpg$/);
  });

  it('未知 MIME 且无扩展名时应使用 .bin', () => {
    const name = buildUniqueFileName('file', 'application/octet-stream');
    expect(name).toMatch(/^file-\d+-[a-z0-9]+\.bin$/);
  });
});
