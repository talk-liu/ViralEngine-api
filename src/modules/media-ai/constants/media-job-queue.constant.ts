import { MediaJobType } from '../enums/media-job-type.enum';

export const DEFAULT_MEDIA_AI_QUEUE_PREFIX = 'media-ai:jobs';

const GPU_JOB_QUEUE_SUFFIX: Partial<Record<MediaJobType, string>> = {
  [MediaJobType.TTS]: 'tts',
  [MediaJobType.LATENTSYNC]: 'latentsync',
  [MediaJobType.FLASHHEAD]: 'flashhead',
};

export function resolveMediaJobQueueKey(
  type: MediaJobType,
  prefix = DEFAULT_MEDIA_AI_QUEUE_PREFIX,
): string {
  const normalizedPrefix = prefix.replace(/:+$/, '');
  const suffix = GPU_JOB_QUEUE_SUFFIX[type] ?? 'cpu';
  return `${normalizedPrefix}:${suffix}`;
}

export function listMediaJobQueueKeys(
  prefix = DEFAULT_MEDIA_AI_QUEUE_PREFIX,
): string[] {
  const normalizedPrefix = prefix.replace(/:+$/, '');
  return [
    `${normalizedPrefix}:cpu`,
    `${normalizedPrefix}:tts`,
    `${normalizedPrefix}:latentsync`,
    `${normalizedPrefix}:flashhead`,
  ];
}
