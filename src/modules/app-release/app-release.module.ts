import { Module } from '@nestjs/common';
import { AppReleaseController } from './controllers/app-release.controller';

@Module({
  controllers: [AppReleaseController],
})
export class AppReleaseModule {}
