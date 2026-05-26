import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAiAssetsController } from './controllers/media-ai-assets.controller';
import { MediaAiController } from './controllers/media-ai.controller';
import { MediaAiInternalController } from './controllers/media-ai-internal.controller';
import { MediaJob } from './entities/media-job.entity';
import { MediaWorkerGuard } from './guards/media-worker.guard';
import { MediaAiService } from './services/media-ai.service';
import { MediaAiStorageService } from './services/media-ai-storage.service';
import { MediaJobQueueService } from './services/media-job-queue.service';

@Module({
  imports: [TypeOrmModule.forFeature([MediaJob])],
  controllers: [
    MediaAiController,
    MediaAiInternalController,
    MediaAiAssetsController,
  ],
  providers: [
    MediaAiService,
    MediaAiStorageService,
    MediaJobQueueService,
    MediaWorkerGuard,
  ],
  exports: [MediaAiService],
})
export class MediaAiModule {}
