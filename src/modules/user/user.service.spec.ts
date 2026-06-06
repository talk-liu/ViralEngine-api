import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            exists: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(UserService);
    repository = module.get(getRepositoryToken(User));
  });

  it('findByReferralCode 应大写推荐码', async () => {
    repository.findOne.mockResolvedValue(null);
    await service.findByReferralCode('abc123');
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { referralCode: 'ABC123' },
    });
  });

  it('existsByReferralCode 应大写推荐码', async () => {
    repository.exists.mockResolvedValue(false);
    await service.existsByReferralCode('abc123');
    expect(repository.exists).toHaveBeenCalledWith({
      where: { referralCode: 'ABC123' },
    });
  });

  it('create 应创建并保存用户', async () => {
    const user = { id: 'u1', phone: '13800000000' } as User;
    repository.create.mockReturnValue(user);
    repository.save.mockResolvedValue(user);

    const result = await service.create({ phone: '13800000000' });
    expect(result).toBe(user);
  });
});
