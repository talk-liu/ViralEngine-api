import { MaterialType } from '../enums/material-type.enum';
import { MaterialGroup } from '../entities/material-group.entity';
import { Material } from '../entities/material.entity';
import { MaterialTag } from '../entities/material-tag.entity';
import {
  toMaterialDetail,
  toMaterialGroupSummary,
  toMaterialSummary,
  toMaterialTagDetail,
  toMaterialTagSummary,
} from './material.mapper';

describe('material.mapper', () => {
  const now = new Date('2026-06-06T08:00:00.000Z');

  const tag: MaterialTag = {
    id: 'tag-1',
    userId: 'user-1',
    name: '封面',
    user: {} as MaterialTag['user'],
    links: [],
    createdAt: now,
    updatedAt: now,
  };

  const group: MaterialGroup = {
    id: 'group-1',
    userId: 'user-1',
    name: '默认分组',
    description: '描述',
    sortOrder: 1,
    user: {} as MaterialGroup['user'],
    materials: [],
    createdAt: now,
    updatedAt: now,
  };

  const material: Material = {
    id: 'material-1',
    userId: 'user-1',
    groupId: group.id,
    type: MaterialType.IMAGE,
    name: 'banner.png',
    storageKey: 'user-1/materials/image/material-1/banner.png',
    mimeType: 'image/png',
    fileName: 'banner.png',
    fileSize: '1024',
    user: {} as Material['user'],
    group,
    tagLinks: [{ tag, materialId: 'material-1', tagId: tag.id } as never],
    createdAt: now,
    updatedAt: now,
  };

  it('toMaterialTagSummary 应映射标签摘要', () => {
    expect(toMaterialTagSummary(tag)).toEqual({
      id: 'tag-1',
      name: '封面',
    });
  });

  it('toMaterialTagDetail 应包含素材数量与时间戳', () => {
    expect(toMaterialTagDetail(tag, 3)).toEqual({
      id: 'tag-1',
      name: '封面',
      materialCount: 3,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  it('toMaterialGroupSummary 应映射分组及素材数量', () => {
    expect(toMaterialGroupSummary(group, 5)).toEqual({
      id: 'group-1',
      name: '默认分组',
      description: '描述',
      sortOrder: 1,
      materialCount: 5,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  it('toMaterialSummary 应映射素材、分组、标签与 URL', () => {
    expect(toMaterialSummary(material, 'https://example.com/file')).toEqual({
      id: 'material-1',
      type: MaterialType.IMAGE,
      name: 'banner.png',
      groupId: 'group-1',
      groupName: '默认分组',
      tags: [{ id: 'tag-1', name: '封面' }],
      mimeType: 'image/png',
      fileName: 'banner.png',
      fileSize: '1024',
      url: 'https://example.com/file',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  it('toMaterialSummary 在无关联数据时应使用默认值', () => {
    const bare: Material = {
      ...material,
      groupId: null,
      group: null,
      tagLinks: undefined as never,
    };

    const result = toMaterialSummary(bare, 'https://example.com/file');
    expect(result.groupName).toBeNull();
    expect(result.tags).toEqual([]);
  });

  it('toMaterialDetail 应与 toMaterialSummary 结果一致', () => {
    const url = 'https://example.com/file';
    expect(toMaterialDetail(material, url)).toEqual(
      toMaterialSummary(material, url),
    );
  });
});
