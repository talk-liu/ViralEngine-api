export interface SmsProvider {
  isConfigured(): boolean;
  sendRegisterCode(phone: string, code: string): Promise<void>;
}
