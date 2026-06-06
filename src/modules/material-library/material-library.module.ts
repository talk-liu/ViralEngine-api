import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialAssetsController } from './controllers/material-assets.controller';
import { MaterialGroupsController } from './controllers/material-groups.controller';
import { MaterialTagsController } from './controllers/material-tags.controller';
import { MaterialsController } from './controllers/materials.controller';
import { MaterialGroup } from './entities/material-group.entity';
import { MaterialTagLink } from './entities/material-tag-link.entity';
import { MaterialTag } from './entities/material-tag.entity';
import { Material } from './entities/material.entity';
import { MaterialGroupService } from './services/material-group.service';
import { MaterialStorageService } from './services/material-storage.service';
import { MaterialTagService } from './services/material-tag.service';
import { MaterialService } from './services/material.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Material,
      MaterialGroup,
      MaterialTag,
      MaterialTagLink,
    ]),
  ],
  controllers: [
    MaterialsController,
    MaterialGroupsController,
    MaterialTagsController,
    MaterialAssetsController,
  ],
  providers: [
    MaterialService,
    MaterialGroupService,
    MaterialTagService,
    MaterialStorageService,
  ],
  exports: [MaterialService],
})
export class MaterialLibraryModule {}
