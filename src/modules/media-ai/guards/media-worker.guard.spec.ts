import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaWorkerGuard } from './media-worker.guard';

describe('MediaWorkerGuard', () => {
  const createContext = (secret?: string) => {
    const guard = new MediaWorkerGuard({
      get: jest.fn().mockReturnValue(secret ?? 'worker-secret'),
    } as unknown as ConfigService);

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          header: (name: string) =>
            name === 'x-worker-secret' ? secret ?? 'worker-secret' : undefined,
        }),
      }),
    } as unknown as ExecutionContext;

    return { guard, context };
  };

  it('密钥未配置时应拒绝', () => {
    const guard = new MediaWorkerGuard({
      get: jest.fn().mockReturnValue(''),
    } as unknown as ConfigService);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ header: () => '' }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('正确密钥应放行', () => {
    const { guard, context } = createContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('错误密钥应拒绝', () => {
    const guard = new MediaWorkerGuard({
      get: jest.fn().mockReturnValue('worker-secret'),
    } as unknown as ConfigService);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ header: () => 'wrong-secret' }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
