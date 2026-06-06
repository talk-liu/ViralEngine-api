import { MediaJobStatus } from '../enums/media-job-status.enum';
import { MediaJobType } from '../enums/media-job-type.enum';
import { MediaJob } from '../entities/media-job.entity';
import { toMediaJobResponse } from './media-job.mapper';

describe('media-job.mapper', () => {
  const now = new Date('2026-06-06T08:00:00.000Z');

  const job: MediaJob = {
    id: 'job-1',
    userId: 'user-1',
    type: MediaJobType.WATERMARK,
    status: MediaJobStatus.COMPLETED,
    progress: 100,
    inputKey: 'user-1/jobs/job-1/input.mp4',
    outputKey: 'user-1/jobs/job-1/output.mp4',
    params: {},
    errorMessage: null,
    startedAt: now,
    completedAt: now,
    createdAt: now,
    updatedAt: now,
    user: {} as MediaJob['user'],
  };

  it('应映射基础字段', () => {
    const response = toMediaJobResponse(job);
    expect(response.id).toBe('job-1');
    expect(response.progress).toBe(100);
    expect(response.startedAt).toBe(now.toISOString());
  });

  it('应注入签名 URL', () => {
    const response = toMediaJobResponse(job, (key) => `signed:${key}`);
    expect(response.inputUrl).toContain('signed:');
    expect(response.outputUrl).toContain('signed:');
  });

  it('应附加 manifest', () => {
    const manifest = { version: 1, clips: [] } as never;
    const response = toMediaJobResponse(job, undefined, manifest);
    expect(response.manifest).toBe(manifest);
  });

  it('无 errorMessage 时不应包含该字段', () => {
    const response = toMediaJobResponse({
      ...job,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
    });
    expect(response.errorMessage).toBeUndefined();
    expect(response.startedAt).toBeUndefined();
  });
});
