import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { PlatformModule } from '../modules/platform/platform.module';
import { PublishResultModule } from '../modules/publish-result/publish-result.module';
import { UserModule } from '../modules/user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CaptchaService } from './services/captcha.service';
import { SmsService } from './services/sms.service';
import { TencentSmsProvider } from './services/sms/tencent-sms.provider';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AdminGuard } from './guards/admin.guard';

@Module({
  imports: [
    UserModule,
    PlatformModule,
    PublishResultModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwt.secret'),
        signOptions: {
          expiresIn: (configService.get<string>('jwt.expiresIn') ??
            '7d') as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SmsService,
    TencentSmsProvider,
    CaptchaService,
    JwtStrategy,
    AdminGuard,
  ],
  exports: [JwtModule, PassportModule, AdminGuard],
})
export class AuthModule {}
