import { MaterialGroup } from '../entities/material-group.entity';
import { Material } from '../entities/material.entity';
import { MaterialTag } from '../entities/material-tag.entity';

function toIso(date: Date): string {
  return date.toISOString();
}

export function toMaterialTagSummary(tag: MaterialTag) {
  return {
    id: tag.id,
    name: tag.name,
  };
}

export function toMaterialTagDetail(tag: MaterialTag, materialCount: number) {
  return {
    id: tag.id,
    name: tag.name,
    materialCount,
    createdAt: toIso(tag.createdAt),
    updatedAt: toIso(tag.updatedAt),
  };
}

export function toMaterialGroupSummary(
  group: MaterialGroup,
  materialCount: number,
) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    sortOrder: group.sortOrder,
    materialCount,
    createdAt: toIso(group.createdAt),
    updatedAt: toIso(group.updatedAt),
  };
}

export function toMaterialSummary(material: Material, url: string) {
  const tags =
    material.tagLinks
      ?.map((link) => link.tag)
      .filter((tag): tag is MaterialTag => Boolean(tag))
      .map(toMaterialTagSummary) ?? [];

  return {
    id: material.id,
    type: material.type,
    name: material.name,
    groupId: material.groupId,
    groupName: material.group?.name ?? null,
    tags,
    mimeType: material.mimeType,
    fileName: material.fileName,
    fileSize: material.fileSize,
    url,
    createdAt: toIso(material.createdAt),
    updatedAt: toIso(material.updatedAt),
  };
}

export function toMaterialDetail(material: Material, url: string) {
  return toMaterialSummary(material, url);
}
