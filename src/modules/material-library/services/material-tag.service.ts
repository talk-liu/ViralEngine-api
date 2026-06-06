import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaveMaterialTagDto } from '../dto/save-material-tag.dto';
import { MaterialTagLink } from '../entities/material-tag-link.entity';
import { MaterialTag } from '../entities/material-tag.entity';
import {
  toMaterialTagDetail,
  toMaterialTagSummary,
} from '../utils/material.mapper';

@Injectable()
export class MaterialTagService {
  constructor(
    @InjectRepository(MaterialTag)
    private readonly tagRepository: Repository<MaterialTag>,
    @InjectRepository(MaterialTagLink)
    private readonly linkRepository: Repository<MaterialTagLink>,
  ) {}

  async list(userId: string) {
    const tags = await this.tagRepository.find({
      where: { userId },
      order: { name: 'ASC' },
    });

    const counts = await this.linkRepository
      .createQueryBuilder('link')
      .innerJoin('link.tag', 'tag')
      .select('link.tag_id', 'tagId')
      .addSelect('COUNT(*)', 'count')
      .where('tag.user_id = :userId', { userId })
      .groupBy('link.tag_id')
      .getRawMany<{ tagId: string; count: string }>();

    const countMap = new Map(
      counts.map((row) => [row.tagId, parseInt(row.count, 10)]),
    );

    const totalMaterials = await this.linkRepository
      .createQueryBuilder('link')
      .innerJoin('link.tag', 'tag')
      .where('tag.user_id = :userId', { userId })
      .getCount();

    return {
      items: tags.map(toMaterialTagSummary),
      materialCount: totalMaterials,
      tagCounts: countMap,
    };
  }

  async create(userId: string, dto: SaveMaterialTagDto) {
    const tag = this.tagRepository.create({
      userId,
      name: dto.name.trim(),
    });

    try {
      const saved = await this.tagRepository.save(tag);
      return toMaterialTagDetail(saved, 0);
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
        throw new ConflictException('标签名称已存在');
      }
      throw err;
    }
  }

  async update(userId: string, tagId: string, dto: SaveMaterialTagDto) {
    const tag = await this.findOwnedTag(userId, tagId);
    tag.name = dto.name.trim();

    try {
      const saved = await this.tagRepository.save(tag);
      const materialCount = await this.linkRepository.count({
        where: { tagId: saved.id },
      });
      return toMaterialTagDetail(saved, materialCount);
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
        throw new ConflictException('标签名称已存在');
      }
      throw err;
    }
  }

  async remove(userId: string, tagId: string): Promise<void> {
    const tag = await this.findOwnedTag(userId, tagId);
    await this.tagRepository.remove(tag);
  }

  async findOwnedTag(userId: string, tagId: string): Promise<MaterialTag> {
    const tag = await this.tagRepository.findOne({
      where: { id: tagId, userId },
    });
    if (!tag) {
      throw new NotFoundException('标签不存在');
    }
    return tag;
  }

  async findOwnedTags(
    userId: string,
    tagIds: string[],
  ): Promise<MaterialTag[]> {
    if (!tagIds.length) {
      return [];
    }

    const uniqueIds = [...new Set(tagIds)];
    const tags = await this.tagRepository.find({
      where: uniqueIds.map((id) => ({ id, userId })),
    });

    if (tags.length !== uniqueIds.length) {
      throw new NotFoundException('部分标签不存在');
    }

    return tags;
  }
}
