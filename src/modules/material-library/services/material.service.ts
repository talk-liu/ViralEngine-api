import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { buildUniqueFileName } from '../../publish-draft/utils/upload-filename.util';
import { detectMaterialType } from '../constants/material-mime.constant';
import { ListMaterialsQueryDto } from '../dto/list-materials-query.dto';
import { UpdateMaterialDto } from '../dto/update-material.dto';
import { UploadMaterialDto } from '../dto/upload-material.dto';
import { MaterialTagLink } from '../entities/material-tag-link.entity';
import { Material } from '../entities/material.entity';
import { MaterialType } from '../enums/material-type.enum';
import {
  toMaterialDetail,
  toMaterialSummary,
} from '../utils/material.mapper';
import { MaterialGroupService } from './material-group.service';
import { MaterialStorageService } from './material-storage.service';
import { MaterialTagService } from './material-tag.service';

@Injectable()
export class MaterialService {
  private maxPerUser = 500;
  private imageMaxBytes = 10 * 1024 * 1024;
  private audioMaxBytes = 100 * 1024 * 1024;
  private videoMaxBytes = 4 * 1024 * 1024 * 1024;

  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(MaterialTagLink)
    private readonly linkRepository: Repository<MaterialTagLink>,
    private readonly storageService: MaterialStorageService,
    private readonly groupService: MaterialGroupService,
    private readonly tagService: MaterialTagService,
    private readonly configService: ConfigService,
  ) {
    this.maxPerUser =
      this.configService.get<number>('materialLibrary.maxPerUser') ?? 500;
    this.imageMaxBytes =
      this.configService.get<number>('materialLibrary.imageMaxBytes') ??
      10 * 1024 * 1024;
    this.audioMaxBytes =
      this.configService.get<number>('materialLibrary.audioMaxBytes') ??
      100 * 1024 * 1024;
    this.videoMaxBytes =
      this.configService.get<number>('materialLibrary.videoMaxBytes') ??
      4 * 1024 * 1024 * 1024;
  }

  async list(userId: string, query: ListMaterialsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.materialRepository
      .createQueryBuilder('material')
      .leftJoinAndSelect('material.group', 'group')
      .leftJoinAndSelect('material.tagLinks', 'tagLink')
      .leftJoinAndSelect('tagLink.tag', 'tag')
      .where('material.user_id = :userId', { userId });

    if (query.groupId) {
      qb.andWhere('material.group_id = :groupId', { groupId: query.groupId });
    }
    if (query.type) {
      qb.andWhere('material.type = :type', { type: query.type });
    }
    if (query.keyword?.trim()) {
      qb.andWhere('material.name LIKE :keyword', {
        keyword: `%${query.keyword.trim()}%`,
      });
    }
    if (query.tagId) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM material_tag_links mtl
          WHERE mtl.material_id = material.id AND mtl.tag_id = :tagId
        )`,
        { tagId: query.tagId },
      );
    }

    qb.orderBy('material.updated_at', 'DESC');

    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items: items.map((material) =>
        toMaterialSummary(
          material,
          this.storageService.getSignedUrl(material.storageKey),
        ),
      ),
      total,
      page,
      pageSize,
    };
  }

  async getDetail(userId: string, materialId: string) {
    const material = await this.findOwnedMaterial(userId, materialId, true);
    return toMaterialDetail(
      material,
      this.storageService.getSignedUrl(material.storageKey),
    );
  }

  async upload(
    userId: string,
    file: Express.Multer.File,
    dto: UploadMaterialDto,
  ) {
    this.assertFilePresent(file);
    const materialType = this.assertSupportedFile(file);

    const count = await this.materialRepository.count({ where: { userId } });
    if (count >= this.maxPerUser) {
      throw new BadRequestException(`素材数量已达上限（${this.maxPerUser}）`);
    }

    if (dto.groupId) {
      await this.groupService.findOwnedGroup(userId, dto.groupId);
    }
    if (dto.tagIds?.length) {
      await this.tagService.findOwnedTags(userId, dto.tagIds);
    }

    const materialId = randomUUID();
    const fileName = buildUniqueFileName(
      materialType,
      file.mimetype,
      file.originalname,
    );
    const storageKey = this.storageService.buildStorageKey(
      userId,
      materialId,
      materialType,
      fileName,
    );
    const displayName =
      dto.name?.trim() || file.originalname?.trim() || fileName;

    let material: Material;
    try {
      await this.storageService.saveFile(storageKey, file.buffer);
      material = this.materialRepository.create({
        id: materialId,
        userId,
        groupId: dto.groupId ?? null,
        type: materialType,
        name: displayName,
        storageKey,
        mimeType: file.mimetype,
        fileName,
        fileSize: String(file.size),
      });
      material = await this.materialRepository.save(material);

      if (dto.tagIds?.length) {
        await this.replaceTagLinks(material.id, dto.tagIds);
      }
    } catch (err) {
      await this.storageService.removeMaterialDirectory(
        userId,
        materialId,
        materialType,
      );
      throw err;
    }

    const saved = await this.findOwnedMaterial(userId, material.id, true);
    return toMaterialDetail(
      saved,
      this.storageService.getSignedUrl(saved.storageKey),
    );
  }

  async update(
    userId: string,
    materialId: string,
    dto: UpdateMaterialDto,
  ) {
    const material = await this.findOwnedMaterial(userId, materialId, false);

    if (dto.name !== undefined) {
      material.name = dto.name.trim();
    }
    if (dto.groupId !== undefined) {
      if (dto.groupId === null) {
        material.groupId = null;
      } else {
        await this.groupService.findOwnedGroup(userId, dto.groupId);
        material.groupId = dto.groupId;
      }
    }

    await this.materialRepository.save(material);

    if (dto.tagIds !== undefined) {
      if (dto.tagIds.length) {
        await this.tagService.findOwnedTags(userId, dto.tagIds);
      }
      await this.replaceTagLinks(material.id, dto.tagIds);
    }

    const saved = await this.findOwnedMaterial(userId, material.id, true);
    return toMaterialDetail(
      saved,
      this.storageService.getSignedUrl(saved.storageKey),
    );
  }

  async remove(userId: string, materialId: string): Promise<void> {
    const material = await this.findOwnedMaterial(userId, materialId, false);
    await this.linkRepository.delete({ materialId: material.id });
    await this.materialRepository.remove(material);
    await this.storageService.removeMaterialDirectory(
      userId,
      material.id,
      material.type,
    );
  }

  private async findOwnedMaterial(
    userId: string,
    materialId: string,
    withRelations: boolean,
  ): Promise<Material> {
    const material = await this.materialRepository.findOne({
      where: { id: materialId, userId },
      relations: withRelations
        ? { group: true, tagLinks: { tag: true } }
        : undefined,
    });
    if (!material) {
      throw new NotFoundException('素材不存在');
    }
    return material;
  }

  private async replaceTagLinks(
    materialId: string,
    tagIds: string[],
  ): Promise<void> {
    await this.linkRepository.delete({ materialId });
    const uniqueTagIds = [...new Set(tagIds)];
    if (!uniqueTagIds.length) {
      return;
    }
    const links = uniqueTagIds.map((tagId) =>
      this.linkRepository.create({ materialId, tagId }),
    );
    await this.linkRepository.save(links);
  }

  private assertFilePresent(file?: Express.Multer.File): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException('请上传文件');
    }
  }

  private assertSupportedFile(file: Express.Multer.File): MaterialType {
    const materialType = detectMaterialType(file.mimetype, file.originalname);
    if (!materialType) {
      throw new UnprocessableEntityException(
        '不支持的文件格式，仅支持图片、音频、视频',
      );
    }

    const maxBytes = this.getMaxBytes(materialType);
    if (file.size > maxBytes) {
      throw new PayloadTooLargeException(
        `${this.typeLabel(materialType)}文件过大`,
      );
    }

    return materialType;
  }

  private getMaxBytes(type: MaterialType): number {
    switch (type) {
      case MaterialType.IMAGE:
        return this.imageMaxBytes;
      case MaterialType.AUDIO:
        return this.audioMaxBytes;
      case MaterialType.VIDEO:
        return this.videoMaxBytes;
    }
  }

  private typeLabel(type: MaterialType): string {
    switch (type) {
      case MaterialType.IMAGE:
        return '图片';
      case MaterialType.AUDIO:
        return '音频';
      case MaterialType.VIDEO:
        return '视频';
    }
  }
}
