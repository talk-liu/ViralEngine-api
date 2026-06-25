import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateAccountNicknameDto {
  @ApiProperty({
    example: '我的抖音号 1',
    description: '账号备注名，用于区分多个矩阵账号',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(64)
  nickname: string;
}
