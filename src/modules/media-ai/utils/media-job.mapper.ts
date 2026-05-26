import type { MediaJob } from '../entities/media-job.entity';
import type { MediaJobResponseDto } from '../dto/media-job-response.dto';

export function toMediaJobResponse(
  job: MediaJob,
  signedUrl?: (key: string) => string,
): MediaJobResponseDto {
  const response: MediaJobResponseDto = {
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };

  if (job.errorMessage) {
    response.errorMessage = job.errorMessage;
  }
  if (job.startedAt) {
    response.startedAt = job.startedAt.toISOString();
  }
  if (job.completedAt) {
    response.completedAt = job.completedAt.toISOString();
  }
  if (signedUrl && job.inputKey) {
    response.inputUrl = signedUrl(job.inputKey);
  }
  if (signedUrl && job.outputKey) {
    response.outputUrl = signedUrl(job.outputKey);
  }

  return response;
}
