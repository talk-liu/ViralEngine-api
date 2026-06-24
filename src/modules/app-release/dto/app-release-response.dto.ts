import { ApiProperty } from '@nestjs/swagger';

export class AppReleaseResponseDto {
  @ApiProperty({ example: '1.0.1', description: '最新可下载客户端版本号' })
  latestVersion: string;

  @ApiProperty({
    example: 'https://cdn.example.com/releases/ViralEngine-1.0.1.zip',
    description: '安装包或 zip 的 HTTPS 直链',
  })
  downloadUrl: string;

  @ApiProperty({
    required: false,
    example: '修复创作者中心切换账号问题',
    description: '更新说明',
  })
  releaseNotes?: string;

  @ApiProperty({
    required: false,
    example: false,
    description: '是否强制更新（预留）',
  })
  forceUpdate?: boolean;
}
