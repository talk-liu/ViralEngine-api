import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class SendSmsCodeDto {
  @ApiProperty({ example: '13800138000', description: '中国大陆手机号' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;
}

export class SendSmsCodeResponseDto {
  @ApiProperty({ example: '验证码已发送' })
  message: string;

  @ApiPropertyOptional({
    example: '123456',
    description: '仅开发环境返回，便于调试',
  })
  debugCode?: string;
}
