import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as tencentcloud from 'tencentcloud-sdk-nodejs';
import type { SmsProvider } from './sms-provider.interface';

const SmsClient = tencentcloud.sms.v20210111.Client;

interface TencentSmsConfig {
  secretId: string;
  secretKey: string;
  sdkAppId: string;
  signName: string;
  templateId: string;
  region: string;
}

@Injectable()
export class TencentSmsProvider implements SmsProvider {
  private readonly logger = new Logger(TencentSmsProvider.name);
  private client: InstanceType<typeof SmsClient> | null = null;

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    const t = this.configService.get<Partial<TencentSmsConfig>>('sms.tencent');
    return Boolean(
      t?.secretId &&
        t?.secretKey &&
        t?.sdkAppId &&
        t?.signName &&
        t?.templateId,
    );
  }

  private getConfig(): TencentSmsConfig {
    return this.configService.get<TencentSmsConfig>('sms.tencent')!;
  }

  private getClient(): InstanceType<typeof SmsClient> {
    if (this.client) {
      return this.client;
    }

    const t = this.getConfig();
    this.client = new SmsClient({
      credential: {
        secretId: t.secretId,
        secretKey: t.secretKey,
      },
      region: t.region,
      profile: {
        signMethod: 'HmacSHA256',
        httpProfile: {
          reqMethod: 'POST',
          reqTimeout: 10,
          endpoint: 'sms.tencentcloudapi.com',
        },
      },
    });

    return this.client;
  }

  private toE164(phone: string): string {
    return phone.startsWith('+') ? phone : `+86${phone}`;
  }

  async sendRegisterCode(phone: string, code: string): Promise<void> {
    const t = this.getConfig();
    const resp = await this.getClient().SendSms({
      SmsSdkAppId: t.sdkAppId,
      SignName: t.signName,
      TemplateId: t.templateId,
      TemplateParamSet: [code],
      PhoneNumberSet: [this.toE164(phone)],
    });

    const status = resp.SendStatusSet?.[0];
    if (status?.Code !== 'Ok') {
      this.logger.error(
        `短信发送失败 [${phone}]: ${status?.Code} ${status?.Message}`,
      );
      throw new Error(status?.Message ?? '短信发送失败');
    }
  }
}
