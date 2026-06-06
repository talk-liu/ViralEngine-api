import { MediaJobType } from '../enums/media-job-type.enum';
import {
  DEFAULT_MEDIA_AI_QUEUE_PREFIX,
  listMediaJobQueueKeys,
  resolveMediaJobQueueKey,
} from './media-job-queue.constant';

describe('media-job-queue.constant', () => {
  describe('resolveMediaJobQueueKey', () => {
    it('GPU 任务应路由到对应后缀队列', () => {
      expect(resolveMediaJobQueueKey(MediaJobType.TTS)).toBe(
        `${DEFAULT_MEDIA_AI_QUEUE_PREFIX}:tts`,
      );
      expect(resolveMediaJobQueueKey(MediaJobType.LATENTSYNC)).toBe(
        `${DEFAULT_MEDIA_AI_QUEUE_PREFIX}:latentsync`,
      );
      expect(resolveMediaJobQueueKey(MediaJobType.FLASHHEAD)).toBe(
        `${DEFAULT_MEDIA_AI_QUEUE_PREFIX}:flashhead`,
      );
    });

    it('CPU 任务应路由到 cpu 队列', () => {
      expect(resolveMediaJobQueueKey(MediaJobType.WATERMARK)).toBe(
        `${DEFAULT_MEDIA_AI_QUEUE_PREFIX}:cpu`,
      );
    });

    it('应去除 prefix 尾部多余冒号', () => {
      expect(resolveMediaJobQueueKey(MediaJobType.TTS, 'custom:jobs:')).toBe(
        'custom:jobs:tts',
      );
    });
  });

  describe('listMediaJobQueueKeys', () => {
    it('应列出全部队列 key', () => {
      expect(listMediaJobQueueKeys()).toEqual([
        `${DEFAULT_MEDIA_AI_QUEUE_PREFIX}:cpu`,
        `${DEFAULT_MEDIA_AI_QUEUE_PREFIX}:tts`,
        `${DEFAULT_MEDIA_AI_QUEUE_PREFIX}:latentsync`,
        `${DEFAULT_MEDIA_AI_QUEUE_PREFIX}:flashhead`,
      ]);
    });
  });
});
