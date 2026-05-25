import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ProxyType } from '../enums/proxy-type.enum';

export class UpsertAccountNetworkDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ enum: ProxyType, example: ProxyType.HTTP })
  @IsOptional()
  @IsEnum(ProxyType)
  proxyType?: ProxyType;

  @ApiPropertyOptional({ example: 'proxy.example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  host?: string;

  @ApiPropertyOptional({ example: 8080 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({ example: 'user' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  username?: string;

  @ApiPropertyOptional({
    example: 'secret',
    description: '不传表示不修改已有密码',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  password?: string;

  @ApiPropertyOptional({ example: '广东-深圳' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  regionLabel?: string;
}
