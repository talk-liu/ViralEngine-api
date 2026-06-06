import {
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialTagLink } from '../entities/material-tag-link.entity';
import { Material } from '../entities/material.entity';
import { MaterialType } from '../enums/material-type.enum';
import { MaterialGroupService } from './material-group.service';
import { MaterialStorageService } from './material-storage.service';
import { MaterialTagService } from './material-tag.service';
import { MaterialService } from './material.service';

describe('MaterialService', () => {
  let service: MaterialService;
  let materialRepository: jest.Mocked<Repository<Material>>;
  let linkRepository: jest.Mocked<Repository<MaterialTagLink>>;
  let storageService: jest.Mocked<
    Pick<
      MaterialStorageService,
      | 'getSignedUrl'
      | 'buildStorageKey'
      | 'saveFile'
      | 'removeMaterialDirectory'
    >
  >;
  let groupService: jest.Mocked<Pick<MaterialGroupService, 'findOwnedGroup'>>;
  let tagService: jest.Mocked<
    Pick<MaterialTagService, 'findOwnedTags'>
  >;

  const userId = 'user-1';
  const materialId = 'material-1';
  const now = new Date('2026-06-06T08:00:00.000Z');

  const material: Material = {
    id: materialId,
    userId,
    groupId: null,
    type: MaterialType.IMAGE,
    name: 'photo.png',
    storageKey: 'user-1/materials/image/material-1/photo.png',
    mimeType: 'image/png',
    fileName: 'photo.png',
    fileSize: '100',
    user: {} as Material['user'],
    group: null,
    tagLinks: [],
    createdAt: now,
    updatedAt: now,
  };

  const createFile = (
    overrides: Partial<Express.Multer.File> = {},
  ): Express.Multer.File =>
    ({
      buffer: Buffer.from('data'),
      mimetype: 'image/png',
      originalname: 'photo.png',
      size: 100,
      ...overrides,
    }) as Express.Multer.File;

  beforeEach(async () => {
    storageService = {
      getSignedUrl: jest.fn().mockReturnValue('https://example.com/signed'),
      buildStorageKey: jest
        .fn()
        .mockReturnValue('user-1/materials/image/material-1/photo.png'),
      saveFile: jest.fn().mockResolvedValue(undefined),
      removeMaterialDirectory: jest.fn().mockResolvedValue(undefined),
    };
    groupService = { findOwnedGroup: jest.fn() };
    tagService = { findOwnedTags: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialService,
        {
          provide: getRepositoryToken(Material),
          useValue: {
            createQueryBuilder: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MaterialTagLink),
          useValue: {
            delete: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: MaterialStorageService,
          useValue: storageService,
        },
        {
          provide: MaterialGroupService,
          useValue: groupService,
        },
        {
          provide: MaterialTagService,
          useValue: tagService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, number> = {
                'materialLibrary.maxPerUser': 500,
                'materialLibrary.imageMaxBytes': 10 * 1024 * 1024,
                'materialLibrary.audioMaxBytes': 100 * 1024 * 1024,
                'materialLibrary.videoMaxBytes': 4 * 1024 * 1024 * 1024,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get(MaterialService);
    materialRepository = module.get(getRepositoryToken(Material));
    linkRepository = module.get(getRepositoryToken(MaterialTagLink));
  });

  describe('getDetail', () => {
    it('应返回素材详情', async () => {
      materialRepository.findOne.mockResolvedValue(material);

      const result = await service.getDetail(userId, materialId);

      expect(result.id).toBe(materialId);
      expect(result.url).toBe('https://example.com/signed');
    });

    it('素材不存在时应抛出 NotFoundException', async () => {
      materialRepository.findOne.mockResolvedValue(null);

      await expect(service.getDetail(userId, materialId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('upload', () => {
    it('未上传文件时应抛出 BadRequestException', async () => {
      await expect(
        service.upload(userId, undefined as never, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('不支持的格式应抛出 UnprocessableEntityException', async () => {
      const file = createFile({
        mimetype: 'text/plain',
        originalname: 'readme.txt',
      });

      await expect(service.upload(userId, file, {})).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('文件过大应抛出 PayloadTooLargeException', async () => {
      const file = createFile({ size: 11 * 1024 * 1024 });

      await expect(service.upload(userId, file, {})).rejects.toThrow(
        PayloadTooLargeException,
      );
    });

    it('达到数量上限应抛出 BadRequestException', async () => {
      materialRepository.count.mockResolvedValue(500);

      await expect(service.upload(userId, createFile(), {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('应成功上传并返回详情', async () => {
      materialRepository.count.mockResolvedValue(0);
      materialRepository.create.mockReturnValue(material);
      materialRepository.save.mockResolvedValue(material);
      materialRepository.findOne.mockResolvedValue(material);

      const result = await service.upload(userId, createFile(), {});

      expect(storageService.saveFile).toHaveBeenCalled();
      expect(materialRepository.save).toHaveBeenCalled();
      expect(result.id).toBe(materialId);
    });

    it('保存失败时应清理存储目录', async () => {
      materialRepository.count.mockResolvedValue(0);
      materialRepository.create.mockReturnValue(material);
      storageService.saveFile.mockRejectedValue(new Error('disk full'));

      await expect(service.upload(userId, createFile(), {})).rejects.toThrow(
        'disk full',
      );
      expect(storageService.removeMaterialDirectory).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('应更新名称与分组', async () => {
      materialRepository.findOne
        .mockResolvedValueOnce({ ...material })
        .mockResolvedValueOnce(material);
      materialRepository.save.mockResolvedValue(material);
      groupService.findOwnedGroup.mockResolvedValue({} as never);

      const result = await service.update(userId, materialId, {
        name: '  新名称  ',
        groupId: 'group-1',
      });

      expect(materialRepository.save).toHaveBeenCalled();
      expect(result.id).toBe(materialId);
    });

    it('应替换标签关联', async () => {
      materialRepository.findOne
        .mockResolvedValueOnce({ ...material })
        .mockResolvedValueOnce(material);
      materialRepository.save.mockResolvedValue(material);
      linkRepository.create.mockImplementation(
        (dto) => dto as MaterialTagLink,
      );

      await service.update(userId, materialId, {
        tagIds: ['tag-1', 'tag-1', 'tag-2'],
      });

      expect(linkRepository.delete).toHaveBeenCalledWith({ materialId });
      expect(linkRepository.save).toHaveBeenCalledWith([
        { materialId, tagId: 'tag-1' },
        { materialId, tagId: 'tag-2' },
      ]);
    });
  });

  describe('remove', () => {
    it('应删除素材、标签关联与存储目录', async () => {
      materialRepository.findOne.mockResolvedValue(material);
      materialRepository.remove.mockResolvedValue(material);

      await service.remove(userId, materialId);

      expect(linkRepository.delete).toHaveBeenCalledWith({ materialId });
      expect(materialRepository.remove).toHaveBeenCalledWith(material);
      expect(storageService.removeMaterialDirectory).toHaveBeenCalledWith(
        userId,
        materialId,
        MaterialType.IMAGE,
      );
    });
  });
});
