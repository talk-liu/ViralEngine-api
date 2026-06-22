import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ListLiveRoomsPublicQueryDto {
  @ApiProperty({ description: '邀请码', example: 'A1B2C3D4' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  inviteCode: string;
}
