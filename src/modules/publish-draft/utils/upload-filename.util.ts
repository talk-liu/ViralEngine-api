import * as path from 'path';

const MIME_TO_EXT: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'video/x-msvideo': '.avi',
  'video/mp2t': '.ts',
  'video/vnd.dlna.mpeg-tts': '.ts',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/** 生成唯一文件名，不使用原始文件名 */
export function buildUniqueFileName(
  prefix: string,
  mimeType: string,
  originalName?: string,
): string {
  const fromName = path.extname(originalName ?? '').toLowerCase();
  const ext =
    fromName && /^\.[a-z0-9]+$/.test(fromName)
      ? fromName
      : (MIME_TO_EXT[mimeType] ?? '.bin');
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${id}${ext}`;
}
