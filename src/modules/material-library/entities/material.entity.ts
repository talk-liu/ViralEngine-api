import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { MaterialType } from '../enums/material-type.enum';
import { MaterialGroup } from './material-group.entity';
import { MaterialTagLink } from './material-tag-link.entity';

@Entity('materials')
@Index(['userId', 'updatedAt'])
@Index(['userId', 'groupId'])
@Index(['userId', 'type'])
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'group_id', type: 'varchar', length: 36, nullable: true })
  groupId: string | null;

  @ManyToOne(() => MaterialGroup, (group) => group.materials, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'group_id' })
  group: MaterialGroup | null;

  @Column({ type: 'varchar', length: 16 })
  type: MaterialType;

  @Column({ type: 'varchar', length: 256 })
  name: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 1024 })
  storageKey: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 128 })
  mimeType: string;

  @Column({ name: 'file_name', type: 'varchar', length: 512 })
  fileName: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: string;

  @OneToMany(() => MaterialTagLink, (link) => link.material)
  tagLinks: MaterialTagLink[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
