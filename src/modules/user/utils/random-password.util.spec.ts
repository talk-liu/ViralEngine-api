import { generateRandomPassword } from './random-password.util';

describe('generateRandomPassword', () => {
  it('应生成符合规则的随机密码', () => {
    const password = generateRandomPassword();
    expect(password.length).toBe(10);
    expect(password).toMatch(/[A-Za-z]/);
    expect(password).toMatch(/\d/);
  });
});
