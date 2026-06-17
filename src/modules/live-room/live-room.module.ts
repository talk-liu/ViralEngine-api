import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module';
import { LiveRoomsController } from './controllers/live-rooms.controller';
import { LiveRoomScript } from './entities/live-room-script.entity';
import { LiveRoom } from './entities/live-room.entity';
import { LiveRoomService } from './services/live-room.service';
import { LiveRoomCacheService } from './services/live-room-cache.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([LiveRoom, LiveRoomScript]),
  ],
  controllers: [LiveRoomsController],
  providers: [LiveRoomService, LiveRoomCacheService],
})
export class LiveRoomModule {}
