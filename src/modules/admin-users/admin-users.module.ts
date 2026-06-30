import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { UserModule } from '../user/user.module';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminUserService } from './services/admin-user.service';

@Module({
  imports: [UserModule, AuthModule],
  controllers: [AdminUsersController],
  providers: [AdminUserService],
})
export class AdminUsersModule {}
