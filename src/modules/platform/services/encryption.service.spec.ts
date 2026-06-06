import { EncryptionService } from './encryption.service';
import { ConfigService } from '@nestjs/config';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    service = new EncryptionService({
      get: jest.fn((key: string) =>
        key === 'encryption.key' ? 'test-encryption-key' : undefined,
      ),
    } as unknown as ConfigService);
    service.onModuleInit();
  });

  it('加解密应可往返', () => {
    const plaintext = 'proxy-password-123';
    const ciphertext = service.encrypt(plaintext);
    expect(service.decrypt(ciphertext)).toBe(plaintext);
  });

  it('非法密文格式应抛出错误', () => {
    expect(() => service.decrypt('invalid')).toThrow('Invalid ciphertext format');
  });

  it('每次加密结果应不同（随机 IV）', () => {
    const a = service.encrypt('same');
    const b = service.encrypt('same');
    expect(a).not.toBe(b);
  });
});
