import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class SaveLiveRoomDto {
  @ApiProperty({ description: '直播间名称', example: '晚间带货专场' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name: string;

  @ApiProperty({
    description: '直播间地址',
    example: 'https://live.douyin.com/xxx',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_protocol: true })
  @MaxLength(1024)
  url: string;

  @ApiProperty({
    description: '话术列表，至少一条',
    example: ['家人们晚上好…', '最后50单…'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(5000, { each: true })
  scripts: string[];
}
