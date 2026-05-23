import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '13800138000', description: '手机号' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ example: 'Abc12345', description: '登录密码' })
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  password: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: '图片验证码 ID' })
  @IsString()
  @Length(36, 36)
  captchaId: string;

  @ApiProperty({ example: 'ab12', description: '图片验证码' })
  @IsString()
  @MinLength(4)
  @MaxLength(6)
  captchaCode: string;
}
