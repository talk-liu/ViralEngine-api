import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SaveMaterialTagDto {
  @ApiProperty({ description: '标签名称' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;
}
