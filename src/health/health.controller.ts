import { Controller, Get } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ApiErrorResponseDto } from '../common/dto/api-error.dto';
import { HealthCheckResponseDto } from './dto/health-check-response.dto';
import { RedisHealthIndicator } from './redis.health';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: '服务健康检查', description: '检测 MySQL 与 Redis 连接状态' })
  @ApiOkResponse({ type: HealthCheckResponseDto, description: '所有依赖服务正常' })
  @ApiServiceUnavailableResponse({
    type: HealthCheckResponseDto,
    description: '存在不可用的依赖服务',
  })
  @ApiInternalServerErrorResponse({
    type: ApiErrorResponseDto,
    description: '服务器内部错误',
  })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.isHealthy('redis'),
    ]);
  }
}
