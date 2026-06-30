import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  getPlatformMeta,
  PLATFORM_REGISTRY,
} from '../constants/platforms.config';
import { AccountNetworkProfile } from '../entities/account-network-profile.entity';
import { OAuthBindSession } from '../entities/oauth-bind-session.entity';
import { PlatformAccount } from '../entities/platform-account.entity';
import { PlatformToken } from '../entities/platform-token.entity';
import { BindSessionStatus } from '../enums/bind-session-status.enum';
import { BindStatus } from '../enums/bind-status.enum';
import { OAUTH_PLATFORMS, PlatformId } from '../enums/platform-id.enum';
import { EncryptionService } from './encryption.service';
import { OAuthProviderRegistry } from './oauth-provider.registry';
import {
  addSeconds,
  BoundAccountDto,
  generateOAuthState,
  toBoundAccountDto,
  toBindingPlaceholder,
} from '../utils/platform-account.mapper';
import { OAuthTokenResult } from './oauth/oauth-provider.interface';

const BIND_SESSION_TTL_SECONDS = 900;

@Injectable()
export class PlatformService {
  constructor(
    @InjectRepository(PlatformAccount)
    private readonly accountRepository: Repository<PlatformAccount>,
    @InjectRepository(PlatformToken)
    private readonly tokenRepository: Repository<PlatformToken>,
    @InjectRepository(OAuthBindSession)
    private readonly bindSessionRepository: Repository<OAuthBindSession>,
    @InjectRepository(AccountNetworkProfile)
    private readonly networkRepository: Repository<AccountNetworkProfile>,
    private readonly encryptionService: EncryptionService,
    private readonly oauthRegistry: OAuthProviderRegistry,
  ) {}

  countUserAccounts(userId: string): Promise<number> {
    return this.accountRepository.count({ where: { userId } });
  }

  async listPlatforms(userId: string) {
    const [accounts, pendingSessions] = await Promise.all([
      this.accountRepository.find({
        where: { userId },
        order: { boundAt: 'DESC', createdAt: 'DESC' },
      }),
      this.bindSessionRepository.find({
        where: { userId, status: BindSessionStatus.PENDING },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const accountsByPlatform = new Map<PlatformId, PlatformAccount[]>();
    for (const account of accounts) {
      const list = accountsByPlatform.get(account.platformId) ?? [];
      list.push(account);
      accountsByPlatform.set(account.platformId, list);
    }

    const pendingByPlatform = new Map<PlatformId, OAuthBindSession[]>();
    for (const session of pendingSessions) {
      if (session.expiresAt <= new Date()) {
        continue;
      }
      const list = pendingByPlatform.get(session.platformId) ?? [];
      list.push(session);
      pendingByPlatform.set(session.platformId, list);
    }

    return PLATFORM_REGISTRY.map((platform) => {
      const boundAccounts = (accountsByPlatform.get(platform.id) ?? []).map(
        toBoundAccountDto,
      );
      const bindingPlaceholders = (pendingByPlatform.get(platform.id) ?? []).map(
        toBindingPlaceholder,
      );

      const allAccounts = [...bindingPlaceholders, ...boundAccounts];

      return {
        platform,
        accounts: allAccounts.length > 0 ? allAccounts : undefined,
      };
    });
  }

  async refreshPlatforms(userId: string) {
    await this.bindSessionRepository.update(
      { userId, status: BindSessionStatus.PENDING },
      { status: BindSessionStatus.CANCELLED },
    );

    return this.listPlatforms(userId);
  }

  async createManualAccount(
    userId: string,
    platformId: PlatformId,
    nickname: string,
  ): Promise<BoundAccountDto> {
    const platform = PLATFORM_REGISTRY.find((p) => p.id === platformId);
    if (!platform?.enabled) {
      throw new BadRequestException('该平台暂未开放');
    }

    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      throw new BadRequestException('账号名称不能为空');
    }

    const now = new Date();
    const account = this.accountRepository.create({
      userId,
      platformId,
      openId: `manual_${randomUUID()}`,
      nickname: trimmedNickname,
      avatarUrl: '',
      status: BindStatus.BOUND,
      boundAt: now,
      expiresAt: null,
      lastError: null,
    });

    const saved = await this.accountRepository.save(account);
    return toBoundAccountDto(saved);
  }

  async startBind(userId: string, platformId: PlatformId) {
    const platform = PLATFORM_REGISTRY.find((p) => p.id === platformId);
    if (!platform?.enabled) {
      throw new BadRequestException('该平台暂未开放绑定');
    }
    if (!OAUTH_PLATFORMS.has(platformId)) {
      throw new BadRequestException('该平台仅支持手动添加账号');
    }

    const provider = this.oauthRegistry.getProvider(platformId);
    const state = generateOAuthState();
    const expiresAt = addSeconds(new Date(), BIND_SESSION_TTL_SECONDS);

    const session = this.bindSessionRepository.create({
      userId,
      platformId,
      state,
      status: BindSessionStatus.PENDING,
      expiresAt,
    });
    await this.bindSessionRepository.save(session);

    return {
      bindSessionId: session.id,
      authUrl: provider.buildAuthUrl(state),
      expiresIn: BIND_SESSION_TTL_SECONDS,
    };
  }

  async getBindSession(userId: string, bindSessionId: string) {
    const session = await this.findBindSession(bindSessionId);

    if (session.userId !== userId) {
      throw new ForbiddenException('无权访问该绑定会话');
    }

    if (
      session.status === BindSessionStatus.PENDING &&
      session.expiresAt <= new Date()
    ) {
      session.status = BindSessionStatus.CANCELLED;
      session.errorMessage = '绑定会话已超时';
      await this.bindSessionRepository.save(session);
    }

    if (session.status === BindSessionStatus.SUCCESS && session.accountId) {
      const account = await this.accountRepository.findOne({
        where: { id: session.accountId, userId },
      });

      return {
        status: session.status,
        account: account ? toBoundAccountDto(account) : null,
        error: null,
      };
    }

    return {
      status: session.status,
      account: null,
      error: session.errorMessage,
    };
  }

  async completeBindWithCode(
    userId: string,
    platformId: PlatformId,
    code: string,
    bindSessionId: string,
  ): Promise<BoundAccountDto> {
    const session = await this.findBindSession(bindSessionId);

    if (session.userId !== userId) {
      throw new ForbiddenException('无权操作该绑定会话');
    }

    if (session.platformId !== platformId) {
      throw new BadRequestException('平台与绑定会话不匹配');
    }

    if (session.status !== BindSessionStatus.PENDING) {
      throw new BadRequestException('绑定会话已结束');
    }

    if (session.expiresAt <= new Date()) {
      session.status = BindSessionStatus.CANCELLED;
      session.errorMessage = '绑定会话已超时';
      await this.bindSessionRepository.save(session);
      throw new BadRequestException('绑定会话已超时，请重新发起绑定');
    }

    try {
      const provider = this.oauthRegistry.getProvider(platformId);
      const tokenResult = await provider.exchangeCode(code);
      const userInfo = await provider.fetchUserInfo(
        tokenResult.accessToken,
        tokenResult.openId,
      );

      const account = await this.saveBoundAccount(
        userId,
        platformId,
        tokenResult,
        userInfo.nickname,
        userInfo.avatarUrl,
      );

      session.status = BindSessionStatus.SUCCESS;
      session.accountId = account.id;
      session.errorMessage = null;
      await this.bindSessionRepository.save(session);

      return toBoundAccountDto(account);
    } catch (error) {
      session.status = BindSessionStatus.FAILED;
      session.errorMessage =
        error instanceof Error ? error.message : '绑定失败';
      await this.bindSessionRepository.save(session);
      throw new BadRequestException(session.errorMessage);
    }
  }

  async handleOAuthCallback(
    platformId: PlatformId,
    query: {
      code?: string;
      state?: string;
      error?: string;
      error_description?: string;
    },
  ) {
    const { code, state, error, error_description: errorDescription } = query;

    if (error || !code || !state) {
      const message = errorDescription ?? error ?? '授权已取消';
      if (state) {
        await this.failSessionByState(state, message);
      }
      return this.renderCallbackHtml(false, message);
    }

    const session = await this.bindSessionRepository.findOne({
      where: { state },
    });

    if (!session) {
      return this.renderCallbackHtml(false, '无效的授权状态，请重新绑定');
    }

    if (session.platformId !== platformId) {
      await this.failSession(session, '平台不匹配');
      return this.renderCallbackHtml(false, '平台不匹配');
    }

    if (session.status !== BindSessionStatus.PENDING) {
      return this.renderCallbackHtml(false, '绑定会话已结束');
    }

    if (session.expiresAt <= new Date()) {
      await this.failSession(session, '绑定会话已超时');
      return this.renderCallbackHtml(false, '绑定会话已超时');
    }

    try {
      const provider = this.oauthRegistry.getProvider(platformId);
      const tokenResult = await provider.exchangeCode(code);
      const userInfo = await provider.fetchUserInfo(
        tokenResult.accessToken,
        tokenResult.openId,
      );

      const account = await this.saveBoundAccount(
        session.userId,
        platformId,
        tokenResult,
        userInfo.nickname,
        userInfo.avatarUrl,
      );

      session.status = BindSessionStatus.SUCCESS;
      session.accountId = account.id;
      session.errorMessage = null;
      await this.bindSessionRepository.save(session);

      return this.renderCallbackHtml(true, '授权成功，可关闭此窗口');
    } catch (err) {
      const message = err instanceof Error ? err.message : '绑定失败';
      await this.failSession(session, message);
      return this.renderCallbackHtml(false, message);
    }
  }

  async unbindAccount(userId: string, accountId: string): Promise<void> {
    const account = await this.findOwnedAccount(userId, accountId);

    const token = await this.tokenRepository.findOne({
      where: { accountId: account.id },
    });

    if (token) {
      try {
        const provider = this.oauthRegistry.getProvider(account.platformId);
        const accessToken = this.encryptionService.decrypt(token.accessToken);
        await provider.revokeToken?.(accessToken);
      } catch {
        // 平台 revoke 失败不阻塞解绑
      }
    }

    await this.networkRepository.delete({ accountId: account.id });
    await this.tokenRepository.delete({ accountId: account.id });
    await this.accountRepository.delete({ id: account.id });
  }

  async updateAccountStatus(
    userId: string,
    accountId: string,
    status: BindStatus.BOUND | BindStatus.EXPIRED | BindStatus.ERROR,
    lastError?: string,
  ): Promise<BoundAccountDto> {
    const account = await this.findOwnedAccount(userId, accountId);

    account.status = status;
    if (status === BindStatus.BOUND) {
      account.lastError = null;
    } else if (lastError !== undefined) {
      account.lastError = lastError;
    }

    const saved = await this.accountRepository.save(account);
    return toBoundAccountDto(saved);
  }

  async updateAccountNickname(
    userId: string,
    accountId: string,
    nickname: string,
  ): Promise<BoundAccountDto> {
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      throw new BadRequestException('账号名称不能为空');
    }

    const account = await this.findOwnedAccount(userId, accountId);
    account.nickname = trimmedNickname;

    const saved = await this.accountRepository.save(account);
    return toBoundAccountDto(saved);
  }

  async refreshAccountToken(userId: string, accountId: string) {
    const account = await this.findOwnedAccount(userId, accountId);
    const token = await this.tokenRepository.findOne({
      where: { accountId: account.id },
    });

    if (!token?.refreshToken) {
      throw new BadRequestException('该账号无可刷新的 Token');
    }

    const provider = this.oauthRegistry.getProvider(account.platformId);
    const refreshToken = this.encryptionService.decrypt(token.refreshToken);
    const tokenResult = await provider.refreshAccessToken(refreshToken);

    await this.persistToken(account.id, tokenResult);

    account.expiresAt = tokenResult.expiresIn
      ? addSeconds(new Date(), tokenResult.expiresIn)
      : null;
    account.status = BindStatus.BOUND;
    account.lastError = null;
    await this.accountRepository.save(account);

    return {
      expiresAt: account.expiresAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  async findOwnedAccount(
    userId: string,
    accountId: string,
  ): Promise<PlatformAccount> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw new NotFoundException('账号不存在或不属于当前用户');
    }

    return account;
  }

  private async saveBoundAccount(
    userId: string,
    platformId: PlatformId,
    tokenResult: OAuthTokenResult,
    nickname: string,
    avatarUrl: string,
  ): Promise<PlatformAccount> {
    const existing = await this.accountRepository.findOne({
      where: { userId, platformId, openId: tokenResult.openId },
    });

    if (existing && existing.status === BindStatus.BOUND) {
      throw new ConflictException(
        `该账号已绑定（${existing.nickname || '未知昵称'}），请勿重复绑定`,
      );
    }

    const now = new Date();
    const expiresAt = tokenResult.expiresIn
      ? addSeconds(now, tokenResult.expiresIn)
      : null;

    let account: PlatformAccount;

    if (existing) {
      existing.nickname = nickname;
      existing.avatarUrl = avatarUrl;
      existing.status = BindStatus.BOUND;
      existing.boundAt = now;
      existing.expiresAt = expiresAt;
      existing.lastError = null;
      account = await this.accountRepository.save(existing);
    } else {
      account = this.accountRepository.create({
        userId,
        platformId,
        openId: tokenResult.openId,
        nickname,
        avatarUrl,
        status: BindStatus.BOUND,
        boundAt: now,
        expiresAt,
      });
      account = await this.accountRepository.save(account);
    }

    await this.persistToken(account.id, tokenResult);

    return account;
  }

  private async persistToken(
    accountId: string,
    tokenResult: OAuthTokenResult,
  ): Promise<void> {
    const now = new Date();
    const expiresAt = tokenResult.expiresIn
      ? addSeconds(now, tokenResult.expiresIn)
      : null;
    const refreshExpiresAt = tokenResult.refreshExpiresIn
      ? addSeconds(now, tokenResult.refreshExpiresIn)
      : null;

    const encryptedAccess = this.encryptionService.encrypt(
      tokenResult.accessToken,
    );
    const encryptedRefresh = tokenResult.refreshToken
      ? this.encryptionService.encrypt(tokenResult.refreshToken)
      : null;

    const existing = await this.tokenRepository.findOne({
      where: { accountId },
    });

    if (existing) {
      existing.accessToken = encryptedAccess;
      existing.refreshToken = encryptedRefresh;
      existing.expiresAt = expiresAt;
      existing.refreshExpiresAt = refreshExpiresAt;
      existing.scope = tokenResult.scope ?? null;
      await this.tokenRepository.save(existing);
      return;
    }

    const token = this.tokenRepository.create({
      accountId,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt,
      refreshExpiresAt,
      scope: tokenResult.scope ?? null,
    });
    await this.tokenRepository.save(token);
  }

  private async findBindSession(bindSessionId: string) {
    const session = await this.bindSessionRepository.findOne({
      where: { id: bindSessionId },
    });

    if (!session) {
      throw new NotFoundException('绑定会话不存在');
    }

    return session;
  }

  private async failSessionByState(state: string, message: string) {
    const session = await this.bindSessionRepository.findOne({
      where: { state },
    });

    if (session) {
      await this.failSession(session, message);
    }
  }

  private async failSession(session: OAuthBindSession, message: string) {
    session.status = BindSessionStatus.FAILED;
    session.errorMessage = message;
    await this.bindSessionRepository.save(session);
  }

  private renderCallbackHtml(success: boolean, message: string): string {
    const title = success ? '授权成功' : '授权失败';
    const color = success ? '#16a34a' : '#dc2626';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; background: #f8fafc; }
    .card { background: #fff; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,.08); text-align: center; max-width: 420px; }
    h1 { color: ${color}; margin: 0 0 1rem; font-size: 1.5rem; }
    p { color: #475569; margin: 0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <p style="margin-top:1rem;font-size:.875rem;color:#94a3b8;">可关闭此窗口并返回 ViralEngine</p>
  </div>
</body>
</html>`;
  }
}
