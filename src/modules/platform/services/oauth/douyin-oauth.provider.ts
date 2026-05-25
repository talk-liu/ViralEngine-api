import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformId } from '../../enums/platform-id.enum';
import {
  OAuthProvider,
  OAuthTokenResult,
  OAuthUserInfo,
} from './oauth-provider.interface';

interface DouyinTokenResponse {
  data?: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_expires_in?: number;
    open_id?: string;
    scope?: string;
    error_code?: number;
    description?: string;
  };
  message?: string;
}

interface DouyinUserInfoResponse {
  data?: {
    open_id?: string;
    nickname?: string;
    avatar?: string;
    error_code?: number;
    description?: string;
  };
}

@Injectable()
export class DouyinOAuthProvider implements OAuthProvider {
  readonly platformId = PlatformId.DOUYIN;

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.clientKey && this.clientSecret && this.redirectUri);
  }

  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      response_type: 'code',
      scope: 'user_info',
      redirect_uri: this.redirectUri,
      state,
    });

    return `https://open.douyin.com/platform/oauth/connect/?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenResult> {
    const body = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      code,
      grant_type: 'authorization_code',
    });

    const response = await fetch(
      'https://open.douyin.com/oauth/access_token/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );

    const json = (await response.json()) as DouyinTokenResponse;
    const data = json.data;

    if (!data?.access_token || !data.open_id) {
      throw new Error(data?.description ?? json.message ?? '抖音授权失败');
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      refreshExpiresIn: data.refresh_expires_in,
      scope: data.scope,
      openId: data.open_id,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResult> {
    const body = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(
      'https://open.douyin.com/oauth/refresh_token/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );

    const json = (await response.json()) as DouyinTokenResponse;
    const data = json.data;

    if (!data?.access_token || !data.open_id) {
      throw new Error(data?.description ?? json.message ?? '抖音 Token 刷新失败');
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresIn: data.expires_in,
      refreshExpiresIn: data.refresh_expires_in,
      scope: data.scope,
      openId: data.open_id,
    };
  }

  async fetchUserInfo(
    accessToken: string,
    openId: string,
  ): Promise<OAuthUserInfo> {
    const body = new URLSearchParams({
      access_token: accessToken,
      open_id: openId,
    });

    const response = await fetch('https://open.douyin.com/oauth/userinfo/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const json = (await response.json()) as DouyinUserInfoResponse;
    const data = json.data;

    if (!data?.open_id) {
      throw new Error(data?.description ?? '获取抖音用户信息失败');
    }

    return {
      openId: data.open_id,
      nickname: data.nickname ?? '',
      avatarUrl: data.avatar ?? '',
    };
  }

  private get clientKey(): string {
    return this.configService.get<string>('oauth.douyin.clientKey') ?? '';
  }

  private get clientSecret(): string {
    return this.configService.get<string>('oauth.douyin.clientSecret') ?? '';
  }

  private get redirectUri(): string {
    return this.configService.get<string>('oauth.douyin.redirectUri') ?? '';
  }
}
