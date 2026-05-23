import { ApiProperty } from '@nestjs/swagger';

class HealthIndicatorStatusDto {
  @ApiProperty({ example: 'up', enum: ['up', 'down'] })
  status: string;
}

export class HealthCheckResponseDto {
  @ApiProperty({ example: 'ok', enum: ['ok', 'error'] })
  status: string;

  @ApiProperty({
    example: {
      database: { status: 'up' },
      redis: { status: 'up' },
    },
  })
  info: Record<string, HealthIndicatorStatusDto>;

  @ApiProperty({ example: {} })
  error: Record<string, HealthIndicatorStatusDto>;

  @ApiProperty({
    example: {
      database: { status: 'up' },
      redis: { status: 'up' },
    },
  })
  details: Record<string, HealthIndicatorStatusDto>;
}
