import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

@Injectable()
export class MediaWorkerGuard implements CanActivate {
  private readonly workerSecret: string;

  constructor(configService: ConfigService) {
    this.workerSecret = configService.get<string>('mediaAi.workerSecret') ?? '';
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.workerSecret) {
      throw new UnauthorizedException('Worker 密钥未配置');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header('x-worker-secret') ?? '';
    const expected = Buffer.from(this.workerSecret);
    const actual = Buffer.from(provided);

    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      throw new UnauthorizedException('Worker 认证失败');
    }

    return true;
  }
}
