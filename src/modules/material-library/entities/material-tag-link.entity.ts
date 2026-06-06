import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Material } from './material.entity';
import { MaterialTag } from './material-tag.entity';

@Entity('material_tag_links')
@Index(['tagId'])
export class MaterialTagLink {
  @PrimaryColumn({ name: 'material_id', type: 'varchar', length: 36 })
  materialId: string;

  @PrimaryColumn({ name: 'tag_id', type: 'varchar', length: 36 })
  tagId: string;

  @ManyToOne(() => Material, (material) => material.tagLinks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @ManyToOne(() => MaterialTag, (tag) => tag.links, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: MaterialTag;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
