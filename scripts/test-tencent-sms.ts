/**
 * 一次性测试腾讯云短信配置，用法：
 *   npx ts-node scripts/test-tencent-sms.ts 13800138000
 */
import * as fs from 'fs';
import * as path from 'path';
import * as tencentcloud from 'tencentcloud-sdk-nodejs';

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const phone = process.argv[2];
if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
  console.error('用法: npx ts-node scripts/test-tencent-sms.ts <11位手机号>');
  process.exit(1);
}

const required = [
  'TENCENT_SMS_SECRET_ID',
  'TENCENT_SMS_SECRET_KEY',
  'TENCENT_SMS_SDK_APP_ID',
  'TENCENT_SMS_SIGN_NAME',
  'TENCENT_SMS_TEMPLATE_ID',
] as const;

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('缺少环境变量:', missing.join(', '));
  console.error('请写入 .env 后重试（不要只写在 .env.example）');
  process.exit(1);
}

const SmsClient = tencentcloud.sms.v20210111.Client;
const client = new SmsClient({
  credential: {
    secretId: process.env.TENCENT_SMS_SECRET_ID!,
    secretKey: process.env.TENCENT_SMS_SECRET_KEY!,
  },
  region: process.env.TENCENT_SMS_REGION ?? 'ap-guangzhou',
  profile: {
    signMethod: 'HmacSHA256',
    httpProfile: {
      reqMethod: 'POST',
      reqTimeout: 10,
      endpoint: 'sms.tencentcloudapi.com',
    },
  },
});

const code = '123456';

client
  .SendSms({
    SmsSdkAppId: process.env.TENCENT_SMS_SDK_APP_ID!,
    SignName: process.env.TENCENT_SMS_SIGN_NAME!,
    TemplateId: process.env.TENCENT_SMS_TEMPLATE_ID!,
    TemplateParamSet: [code],
    PhoneNumberSet: [`+86${phone}`],
  })
  .then((resp) => {
    console.log('腾讯云响应:', JSON.stringify(resp, null, 2));
    const status = resp.SendStatusSet?.[0];
    if (status?.Code === 'Ok') {
      console.log('\n✓ 发送成功，请查收短信');
    } else {
      console.error('\n✗ 发送失败:', status?.Code, status?.Message);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('请求异常:', err.message ?? err);
    process.exit(1);
  });
