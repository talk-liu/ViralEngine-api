import { PlatformId } from '../../enums/platform-id.enum';

export interface OAuthTokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  refreshExpiresIn?: number;
  scope?: string;
  openId: string;
}

export interface OAuthUserInfo {
  openId: string;
  nickname: string;
  avatarUrl: string;
}

export interface OAuthProvider {
  readonly platformId: PlatformId;
  isConfigured(): boolean;
  buildAuthUrl(state: string): string;
  exchangeCode(code: string): Promise<OAuthTokenResult>;
  refreshAccessToken(refreshToken: string): Promise<OAuthTokenResult>;
  fetchUserInfo(accessToken: string, openId: string): Promise<OAuthUserInfo>;
  revokeToken?(_accessToken: string): Promise<void>;
}
