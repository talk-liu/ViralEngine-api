import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformId } from '../../enums/platform-id.enum';
import {
  OAuthProvider,
  OAuthTokenResult,
  OAuthUserInfo,
} from './oauth-provider.interface';

interface KuaishouTokenResponse {
  result?: number;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  open_id?: string;
  error_msg?: string;
}

interface KuaishouUserInfoResponse {
  result?: number;
  user_info?: {
    name?: string;
    head?: string;
  };
  error_msg?: string;
}

@Injectable()
export class KuaishouOAuthProvider implements OAuthProvider {
  readonly platformId = PlatformId.KUAISHOU;

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.appId && this.appSecret && this.redirectUri);
  }

  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      app_id: this.appId,
      scope: 'user_info',
      response_type: 'code',
      redirect_uri: this.redirectUri,
      state,
    });

    return `https://open.kuaishou.com/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenResult> {
    const body = new URLSearchParams({
      app_id: this.appId,
      app_secret: this.appSecret,
      code,
      grant_type: 'authorization_code',
    });

    const response = await fetch(
      'https://open.kuaishou.com/oauth2/access_token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );

    const json = (await response.json()) as KuaishouTokenResponse;

    if (json.result !== 1 || !json.access_token || !json.open_id) {
      throw new Error(json.error_msg ?? '快手授权失败');
    }

    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresIn: json.expires_in,
      refreshExpiresIn: json.refresh_token_expires_in,
      openId: json.open_id,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResult> {
    const body = new URLSearchParams({
      app_id: this.appId,
      app_secret: this.appSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(
      'https://open.kuaishou.com/oauth2/refresh_token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );

    const json = (await response.json()) as KuaishouTokenResponse;

    if (json.result !== 1 || !json.access_token || !json.open_id) {
      throw new Error(json.error_msg ?? '快手 Token 刷新失败');
    }

    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? refreshToken,
      expiresIn: json.expires_in,
      refreshExpiresIn: json.refresh_token_expires_in,
      openId: json.open_id,
    };
  }

  async fetchUserInfo(
    accessToken: string,
    openId: string,
  ): Promise<OAuthUserInfo> {
    const params = new URLSearchParams({
      app_id: this.appId,
      access_token: accessToken,
    });

    const response = await fetch(
      `https://open.kuaishou.com/openapi/user_info?${params.toString()}`,
    );

    const json = (await response.json()) as KuaishouUserInfoResponse;

    if (json.result !== 1) {
      throw new Error(json.error_msg ?? '获取快手用户信息失败');
    }

    return {
      openId,
      nickname: json.user_info?.name ?? '',
      avatarUrl: json.user_info?.head ?? '',
    };
  }

  private get appId(): string {
    return this.configService.get<string>('oauth.kuaishou.appId') ?? '';
  }

  private get appSecret(): string {
    return this.configService.get<string>('oauth.kuaishou.appSecret') ?? '';
  }

  private get redirectUri(): string {
    return this.configService.get<string>('oauth.kuaishou.redirectUri') ?? '';
  }
}
