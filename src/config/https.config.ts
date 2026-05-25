import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import type { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';

export interface LocalHttpsConfig {
  enabled: boolean;
  host: string;
  port: number;
  callbackBaseUrl: string;
  keyPath: string;
  certPath: string;
}

export function loadLocalHttpsOptions(
  config: LocalHttpsConfig,
): HttpsOptions | null {
  if (!config.enabled) {
    return null;
  }

  const keyPath = resolve(process.cwd(), config.keyPath);
  const certPath = resolve(process.cwd(), config.certPath);

  if (!existsSync(keyPath) || !existsSync(certPath)) {
    throw new Error(
      `HTTPS 已启用但证书不存在。请先运行: npm run certs:generate（期望: ${keyPath}）`,
    );
  }

  return {
    key: readFileSync(keyPath),
    cert: readFileSync(certPath),
  };
}
