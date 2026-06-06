import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialTagLink } from '../entities/material-tag-link.entity';
import { MaterialTag } from '../entities/material-tag.entity';
import { MaterialTagService } from './material-tag.service';

describe('MaterialTagService', () => {
  let service: MaterialTagService;
  let tagRepository: jest.Mocked<Repository<MaterialTag>>;
  let linkRepository: jest.Mocked<Repository<MaterialTagLink>>;

  const userId = 'user-1';
  const tagId = 'tag-1';
  const now = new Date('2026-06-06T08:00:00.000Z');

  const tag: MaterialTag = {
    id: tagId,
    userId,
    name: '封面',
    user: {} as MaterialTag['user'],
    links: [],
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialTagService,
        {
          provide: getRepositoryToken(MaterialTag),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MaterialTagLink),
          useValue: {
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(MaterialTagService);
    tagRepository = module.get(getRepositoryToken(MaterialTag));
    linkRepository = module.get(getRepositoryToken(MaterialTagLink));
  });

  describe('list', () => {
    it('应返回标签列表及计数', async () => {
      tagRepository.find.mockResolvedValue([tag]);
      const countQb = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ tagId, count: '4' }]),
      };
      const totalQb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(4),
      };
      linkRepository.createQueryBuilder
        .mockReturnValueOnce(countQb as never)
        .mockReturnValueOnce(totalQb as never);

      const result = await service.list(userId);

      expect(result.items).toHaveLength(1);
      expect(result.materialCount).toBe(4);
      expect(result.tagCounts.get(tagId)).toBe(4);
    });
  });

  describe('create', () => {
    it('应创建标签', async () => {
      tagRepository.create.mockReturnValue(tag);
      tagRepository.save.mockResolvedValue(tag);

      const result = await service.create(userId, { name: '  封面  ' });

      expect(tagRepository.create).toHaveBeenCalledWith({
        userId,
        name: '封面',
      });
      expect(result.materialCount).toBe(0);
    });

    it('名称重复时应抛出 ConflictException', async () => {
      tagRepository.create.mockReturnValue(tag);
      tagRepository.save.mockRejectedValue({ code: 'ER_DUP_ENTRY' });

      await expect(service.create(userId, { name: '封面' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findOwnedTags', () => {
    it('空数组应直接返回', async () => {
      await expect(service.findOwnedTags(userId, [])).resolves.toEqual([]);
      expect(tagRepository.find).not.toHaveBeenCalled();
    });

    it('部分标签不存在时应抛出 NotFoundException', async () => {
      tagRepository.find.mockResolvedValue([tag]);

      await expect(
        service.findOwnedTags(userId, [tagId, 'missing-tag']),
      ).rejects.toThrow(NotFoundException);
    });

    it('应去重后查询标签', async () => {
      tagRepository.find.mockResolvedValue([tag]);

      const result = await service.findOwnedTags(userId, [tagId, tagId]);

      expect(tagRepository.find).toHaveBeenCalledWith({
        where: [{ id: tagId, userId }],
      });
      expect(result).toEqual([tag]);
    });
  });

  describe('findOwnedTag', () => {
    it('标签不存在时应抛出 NotFoundException', async () => {
      tagRepository.findOne.mockResolvedValue(null);

      await expect(service.findOwnedTag(userId, tagId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
