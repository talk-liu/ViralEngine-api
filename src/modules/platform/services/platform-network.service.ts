import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountNetworkProfile } from '../entities/account-network-profile.entity';
import { ProxyType } from '../enums/proxy-type.enum';
import { UpsertAccountNetworkDto } from '../dto/network.dto';
import { EncryptionService } from './encryption.service';
import { PlatformService } from './platform.service';

interface IpApiResponse {
  query?: string;
  country?: string;
  countryCode?: string;
  regionName?: string;
  city?: string;
  isp?: string;
  status?: string;
  message?: string;
}

@Injectable()
export class PlatformNetworkService {
  constructor(
    @InjectRepository(AccountNetworkProfile)
    private readonly networkRepository: Repository<AccountNetworkProfile>,
    private readonly platformService: PlatformService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async getNetwork(userId: string, accountId: string) {
    await this.platformService.findOwnedAccount(userId, accountId);

    const profile = await this.networkRepository.findOne({
      where: { accountId, userId },
    });

    return this.toResponse(accountId, profile);
  }

  async upsertNetwork(
    userId: string,
    accountId: string,
    dto: UpsertAccountNetworkDto,
  ) {
    await this.platformService.findOwnedAccount(userId, accountId);

    let profile = await this.networkRepository.findOne({
      where: { accountId, userId },
    });

    if (!profile) {
      profile = this.networkRepository.create({
        accountId,
        userId,
        enabled: false,
        proxyType: ProxyType.NONE,
      });
    }

    if (dto.enabled !== undefined) {
      profile.enabled = dto.enabled;
    }
    if (dto.proxyType !== undefined) {
      profile.proxyType = dto.proxyType;
    }
    if (dto.host !== undefined) {
      profile.host = dto.host || null;
    }
    if (dto.port !== undefined) {
      profile.port = dto.port ?? null;
    }
    if (dto.username !== undefined) {
      profile.username = dto.username || null;
    }
    if (dto.password !== undefined && dto.password !== '') {
      profile.password = this.encryptionService.encrypt(dto.password);
    }
    if (dto.regionLabel !== undefined) {
      profile.regionLabel = dto.regionLabel || null;
    }

    await this.networkRepository.save(profile);

    return this.toResponse(accountId, profile);
  }

  async testNetwork(
    userId: string,
    accountId: string,
    dto: UpsertAccountNetworkDto,
  ) {
    await this.platformService.findOwnedAccount(userId, accountId);

    if (dto.proxyType && dto.proxyType !== ProxyType.NONE) {
      if (!dto.host || !dto.port) {
        throw new BadRequestException('使用代理时请填写 host 与 port');
      }
    }

    const result = await this.probePublicIp();

    const profile = await this.networkRepository.findOne({
      where: { accountId, userId },
    });

    if (profile) {
      profile.lastIp = result.ip;
      profile.lastRegion = `${result.country}-${result.region}`;
      profile.lastCheckedAt = new Date();
      await this.networkRepository.save(profile);
    }

    return result;
  }

  private async probePublicIp() {
    try {
      const response = await fetch(
        'http://ip-api.com/json/?fields=query,country,countryCode,regionName,city,isp,status,message',
      );
      const json = (await response.json()) as IpApiResponse;

      if (json.status === 'fail') {
        throw new Error(json.message ?? 'IP 检测失败');
      }

      return {
        ip: json.query ?? '',
        country: json.countryCode ?? json.country ?? '',
        region: json.regionName ?? '',
        city: json.city ?? '',
        isp: json.isp ?? '',
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : '网络检测失败',
      );
    }
  }

  private toResponse(accountId: string, profile: AccountNetworkProfile | null) {
    return {
      accountId,
      enabled: profile?.enabled ?? false,
      proxyType: profile?.proxyType ?? ProxyType.NONE,
      host: profile?.host ?? undefined,
      port: profile?.port ?? undefined,
      username: profile?.username ?? undefined,
      password: '',
      regionLabel: profile?.regionLabel ?? undefined,
      lastIp: profile?.lastIp ?? undefined,
      lastRegion: profile?.lastRegion ?? undefined,
      lastCheckedAt: profile?.lastCheckedAt?.toISOString(),
    };
  }
}
