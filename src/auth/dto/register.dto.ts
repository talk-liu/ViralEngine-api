import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Match } from '../../common/decorators/match.decorator';

export class RegisterDto {
  @ApiProperty({ example: '13800138000', description: '手机号' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ example: '123456', description: '短信验证码' })
  @IsString()
  @Length(6, 6, { message: '验证码为 6 位数字' })
  @Matches(/^\d{6}$/, { message: '验证码为 6 位数字' })
  smsCode: string;

  @ApiProperty({ example: 'Abc12345', description: '登录密码' })
  @IsString()
  @MinLength(8, { message: '密码至少 8 位' })
  @MaxLength(32, { message: '密码最多 32 位' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: '密码须同时包含字母和数字',
  })
  password: string;

  @ApiProperty({ example: 'Abc12345', description: '确认密码' })
  @IsString()
  @Match('password', { message: '两次输入的密码不一致' })
  confirmPassword: string;

  @ApiPropertyOptional({ example: 'A1B2C3D4', description: '推荐码（选填）' })
  @IsOptional()
  @IsString()
  @Length(8, 8, { message: '推荐码为 8 位' })
  referralCode?: string;
}
