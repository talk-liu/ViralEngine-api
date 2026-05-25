import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PlatformId } from '../enums/platform-id.enum';
import { DouyinOAuthProvider } from './oauth/douyin-oauth.provider';
import { KuaishouOAuthProvider } from './oauth/kuaishou-oauth.provider';
import { OAuthProvider } from './oauth/oauth-provider.interface';

@Injectable()
export class OAuthProviderRegistry {
  private readonly providers: Map<PlatformId, OAuthProvider>;

  constructor(
    douyinProvider: DouyinOAuthProvider,
    kuaishouProvider: KuaishouOAuthProvider,
  ) {
    this.providers = new Map<PlatformId, OAuthProvider>([
      [PlatformId.DOUYIN, douyinProvider],
      [PlatformId.KUAISHOU, kuaishouProvider],
    ]);
  }

  getProvider(platformId: PlatformId): OAuthProvider {
    const provider = this.providers.get(platformId);
    if (!provider) {
      throw new BadRequestException(`平台 ${platformId} 暂不支持 OAuth 绑定`);
    }

    if (!provider.isConfigured()) {
      throw new BadRequestException(
        `平台 ${platformId} OAuth 凭证未配置，请联系管理员`,
      );
    }

    return provider;
  }

  hasProvider(platformId: PlatformId): boolean {
    return this.providers.has(platformId);
  }
}
