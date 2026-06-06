import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAccount } from '../platform/entities/platform-account.entity';
import { PublishDraft } from '../publish-draft/entities/publish-draft.entity';
import { PublishResultsController } from './controllers/publish-results.controller';
import { PublishBatchItem } from './entities/publish-batch-item.entity';
import { PublishBatch } from './entities/publish-batch.entity';
import { PublishResultService } from './services/publish-result.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PublishBatch,
      PublishBatchItem,
      PublishDraft,
      PlatformAccount,
    ]),
  ],
  controllers: [PublishResultsController],
  providers: [PublishResultService],
  exports: [PublishResultService],
})
export class PublishResultModule {}
