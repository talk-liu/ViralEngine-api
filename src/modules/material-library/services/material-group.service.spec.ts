import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialGroup } from '../entities/material-group.entity';
import { Material } from '../entities/material.entity';
import { MaterialGroupService } from './material-group.service';

describe('MaterialGroupService', () => {
  let service: MaterialGroupService;
  let groupRepository: jest.Mocked<Repository<MaterialGroup>>;
  let materialRepository: jest.Mocked<Repository<Material>>;

  const userId = 'user-1';
  const groupId = 'group-1';
  const now = new Date('2026-06-06T08:00:00.000Z');

  const group: MaterialGroup = {
    id: groupId,
    userId,
    name: '默认分组',
    description: null,
    sortOrder: 0,
    user: {} as MaterialGroup['user'],
    materials: [],
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialGroupService,
        {
          provide: getRepositoryToken(MaterialGroup),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Material),
          useValue: {
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(MaterialGroupService);
    groupRepository = module.get(getRepositoryToken(MaterialGroup));
    materialRepository = module.get(getRepositoryToken(Material));
  });

  describe('list', () => {
    it('应返回分组列表及素材数量', async () => {
      groupRepository.find.mockResolvedValue([group]);
      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { groupId, count: '2' },
        ]),
      };
      materialRepository.createQueryBuilder.mockReturnValue(qb as never);

      const result = await service.list(userId);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: groupId,
        name: '默认分组',
        materialCount: 2,
      });
    });
  });

  describe('create', () => {
    it('应创建分组', async () => {
      groupRepository.create.mockReturnValue(group);
      groupRepository.save.mockResolvedValue(group);

      const result = await service.create(userId, { name: '  默认分组  ' });

      expect(groupRepository.create).toHaveBeenCalledWith({
        userId,
        name: '默认分组',
        description: null,
        sortOrder: 0,
      });
      expect(result.materialCount).toBe(0);
    });

    it('名称重复时应抛出 ConflictException', async () => {
      groupRepository.create.mockReturnValue(group);
      groupRepository.save.mockRejectedValue({ code: 'ER_DUP_ENTRY' });

      await expect(
        service.create(userId, { name: '默认分组' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('应更新分组并返回素材数量', async () => {
      groupRepository.findOne.mockResolvedValue({ ...group });
      groupRepository.save.mockResolvedValue({
        ...group,
        name: '新名称',
      });
      materialRepository.count.mockResolvedValue(3);

      const result = await service.update(userId, groupId, {
        name: '  新名称  ',
        description: '说明',
      });

      expect(result.name).toBe('新名称');
      expect(result.materialCount).toBe(3);
    });
  });

  describe('remove', () => {
    it('应删除所属分组', async () => {
      groupRepository.findOne.mockResolvedValue(group);
      groupRepository.remove.mockResolvedValue(group);

      await service.remove(userId, groupId);

      expect(groupRepository.remove).toHaveBeenCalledWith(group);
    });
  });

  describe('findOwnedGroup', () => {
    it('分组不存在时应抛出 NotFoundException', async () => {
      groupRepository.findOne.mockResolvedValue(null);

      await expect(service.findOwnedGroup(userId, groupId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
