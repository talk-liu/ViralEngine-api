import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaveMaterialGroupDto } from '../dto/save-material-group.dto';
import { MaterialGroup } from '../entities/material-group.entity';
import { Material } from '../entities/material.entity';
import { toMaterialGroupSummary } from '../utils/material.mapper';

@Injectable()
export class MaterialGroupService {
  constructor(
    @InjectRepository(MaterialGroup)
    private readonly groupRepository: Repository<MaterialGroup>,
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
  ) {}

  async list(userId: string) {
    const groups = await this.groupRepository.find({
      where: { userId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    const counts = await this.materialRepository
      .createQueryBuilder('material')
      .select('material.group_id', 'groupId')
      .addSelect('COUNT(*)', 'count')
      .where('material.user_id = :userId', { userId })
      .andWhere('material.group_id IS NOT NULL')
      .groupBy('material.group_id')
      .getRawMany<{ groupId: string; count: string }>();

    const countMap = new Map(
      counts.map((row) => [row.groupId, parseInt(row.count, 10)]),
    );

    return {
      items: groups.map((group) =>
        toMaterialGroupSummary(group, countMap.get(group.id) ?? 0),
      ),
    };
  }

  async create(userId: string, dto: SaveMaterialGroupDto) {
    const group = this.groupRepository.create({
      userId,
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
      sortOrder: dto.sortOrder ?? 0,
    });

    try {
      const saved = await this.groupRepository.save(group);
      return toMaterialGroupSummary(saved, 0);
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
        throw new ConflictException('分组名称已存在');
      }
      throw err;
    }
  }

  async update(userId: string, groupId: string, dto: SaveMaterialGroupDto) {
    const group = await this.findOwnedGroup(userId, groupId);
    group.name = dto.name.trim();
    group.description = dto.description?.trim() ?? null;
    if (dto.sortOrder !== undefined) {
      group.sortOrder = dto.sortOrder;
    }

    try {
      const saved = await this.groupRepository.save(group);
      const materialCount = await this.materialRepository.count({
        where: { userId, groupId: saved.id },
      });
      return toMaterialGroupSummary(saved, materialCount);
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
        throw new ConflictException('分组名称已存在');
      }
      throw err;
    }
  }

  async remove(userId: string, groupId: string): Promise<void> {
    const group = await this.findOwnedGroup(userId, groupId);
    await this.groupRepository.remove(group);
  }

  async findOwnedGroup(userId: string, groupId: string): Promise<MaterialGroup> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId, userId },
    });
    if (!group) {
      throw new NotFoundException('分组不存在');
    }
    return group;
  }
}
