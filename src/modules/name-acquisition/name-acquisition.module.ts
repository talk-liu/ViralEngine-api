import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NameAcquisitionController } from './controllers/name-acquisition.controller';
import { NameAcquisitionRecord } from './entities/name-acquisition-record.entity';
import { NameAcquisitionService } from './services/name-acquisition.service';

@Module({
  imports: [TypeOrmModule.forFeature([NameAcquisitionRecord])],
  controllers: [NameAcquisitionController],
  providers: [NameAcquisitionService],
})
export class NameAcquisitionModule {}
