import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from '../../modules/user/entities/user.entity';
import { UserService } from '../../modules/user/user.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userService: jest.Mocked<Pick<UserService, 'findById'>>;

  beforeEach(async () => {
    userService = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('jwt-secret') },
        },
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    strategy = module.get(JwtStrategy);
  });

  it('用户存在且 token 版本匹配时应返回 AuthUser', async () => {
    userService.findById.mockResolvedValue({
      id: 'user-1',
      phone: '13800000000',
      isAdmin: false,
      tokenVersion: 1,
    } as User);

    await expect(
      strategy.validate({ sub: 'user-1', phone: '13800000000', tv: 1 }),
    ).resolves.toEqual({
      id: 'user-1',
      phone: '13800000000',
      isAdmin: false,
    });
  });

  it('token 版本不匹配时应抛出 UnauthorizedException', async () => {
    userService.findById.mockResolvedValue({
      id: 'user-1',
      phone: '13800000000',
      isAdmin: false,
      tokenVersion: 2,
    } as User);

    await expect(
      strategy.validate({ sub: 'user-1', phone: '13800000000', tv: 1 }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('用户不存在时应抛出 UnauthorizedException', async () => {
    userService.findById.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'missing', phone: '13800000000' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
