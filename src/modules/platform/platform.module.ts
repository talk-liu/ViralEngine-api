import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OAuthController } from './controllers/oauth.controller';
import { PlatformsController } from './controllers/platforms.controller';
import { AccountNetworkProfile } from './entities/account-network-profile.entity';
import { OAuthBindSession } from './entities/oauth-bind-session.entity';
import { PlatformAccount } from './entities/platform-account.entity';
import { PlatformToken } from './entities/platform-token.entity';
import { EncryptionService } from './services/encryption.service';
import { DouyinOAuthProvider } from './services/oauth/douyin-oauth.provider';
import { KuaishouOAuthProvider } from './services/oauth/kuaishou-oauth.provider';
import { OAuthProviderRegistry } from './services/oauth-provider.registry';
import { PlatformNetworkService } from './services/platform-network.service';
import { PlatformService } from './services/platform.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlatformAccount,
      PlatformToken,
      OAuthBindSession,
      AccountNetworkProfile,
    ]),
  ],
  controllers: [PlatformsController, OAuthController],
  providers: [
    PlatformService,
    PlatformNetworkService,
    EncryptionService,
    DouyinOAuthProvider,
    KuaishouOAuthProvider,
    OAuthProviderRegistry,
  ],
  exports: [PlatformService],
})
export class PlatformModule {}
