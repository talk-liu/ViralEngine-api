import selfsigned from 'selfsigned';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const certDir = join(process.cwd(), 'certs');
const keyPath = join(certDir, 'dev-key.pem');
const certPath = join(certDir, 'dev-cert.pem');

if (existsSync(keyPath) && existsSync(certPath)) {
  console.log('开发证书已存在，跳过生成。');
  process.exit(0);
}

mkdirSync(certDir, { recursive: true });

const pems = await selfsigned.generate(
  [{ name: 'commonName', value: '127.0.0.1' }],
  {
    days: 825,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' },
        ],
      },
    ],
  },
);

writeFileSync(keyPath, pems.private, 'utf8');
writeFileSync(certPath, pems.cert, 'utf8');

console.log('开发 HTTPS 证书已生成。');
console.log(`  ${keyPath}`);
console.log(`  ${certPath}`);
console.log('OAuth 回调: https://127.0.0.1:3443/api/oauth/douyin/callback');
