import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublishDraftAssetsController } from './controllers/publish-draft-assets.controller';
import { PublishDraftsController } from './controllers/publish-drafts.controller';
import { PublishDraftAsset } from './entities/publish-draft-asset.entity';
import { PublishDraft } from './entities/publish-draft.entity';
import { PublishDraftStorageService } from './services/publish-draft-storage.service';
import { PublishDraftService } from './services/publish-draft.service';

@Module({
  imports: [TypeOrmModule.forFeature([PublishDraft, PublishDraftAsset])],
  controllers: [PublishDraftsController, PublishDraftAssetsController],
  providers: [PublishDraftService, PublishDraftStorageService],
  exports: [PublishDraftService],
})
export class PublishDraftModule {}
