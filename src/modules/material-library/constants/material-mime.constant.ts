import { MaterialType } from '../enums/material-type.enum';

export const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/mp2t',
  'video/vnd.dlna.mpeg-tts',
]);

export const VIDEO_FILE_EXTENSIONS = new Set([
  '.mp4',
  '.mov',
  '.webm',
  '.avi',
  '.ts',
]);

export const AUDIO_MIME_TYPES = new Set([
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp3',
  'audio/flac',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
]);

export const AUDIO_FILE_EXTENSIONS = new Set([
  '.wav',
  '.mp3',
  '.flac',
  '.ogg',
  '.m4a',
  '.aac',
]);

export const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
]);

export const IMAGE_FILE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.bmp',
]);

export function detectMaterialType(
  mimeType: string,
  originalName?: string,
): MaterialType | null {
  if (IMAGE_MIME_TYPES.has(mimeType)) {
    return MaterialType.IMAGE;
  }
  if (AUDIO_MIME_TYPES.has(mimeType)) {
    return MaterialType.AUDIO;
  }
  if (VIDEO_MIME_TYPES.has(mimeType)) {
    return MaterialType.VIDEO;
  }

  const ext =
    (originalName ?? '').toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
  if (IMAGE_FILE_EXTENSIONS.has(ext)) {
    return MaterialType.IMAGE;
  }
  if (AUDIO_FILE_EXTENSIONS.has(ext)) {
    return MaterialType.AUDIO;
  }
  if (VIDEO_FILE_EXTENSIONS.has(ext)) {
    return MaterialType.VIDEO;
  }

  return null;
}
