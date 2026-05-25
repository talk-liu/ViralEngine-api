import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

@Injectable()
export class EncryptionService implements OnModuleInit {
  private key: Buffer;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const rawKey =
      this.configService.get<string>('encryption.key') ??
      this.configService.get<string>('jwt.secret') ??
      'change-me-in-production';

    this.key = createHash('sha256').update(rawKey).digest();
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  decrypt(ciphertext: string): string {
    const [ivB64, tagB64, dataB64] = ciphertext.split(':');
    if (!ivB64 || !tagB64 || !dataB64) {
      throw new Error('Invalid ciphertext format');
    }

    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(dataB64, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }
}
