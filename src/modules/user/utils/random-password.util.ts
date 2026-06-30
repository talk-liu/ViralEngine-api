import { randomBytes } from 'crypto';

const PASSWORD_CHARS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export function generateRandomPassword(length = 10): string {
  const bytes = randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += PASSWORD_CHARS[bytes[i]! % PASSWORD_CHARS.length];
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return generateRandomPassword(length);
  }
  return password;
}
