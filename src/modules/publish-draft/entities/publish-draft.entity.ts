import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { DraftStatus } from '../enums/draft-status.enum';
import type { PublishDraftPayload } from '../types/publish-draft-payload.type';

@Entity('publish_drafts')
@Index(['userId', 'updatedAt'])
export class PublishDraft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'list_title', type: 'varchar', length: 256 })
  listTitle: string;

  @Column({ name: 'video_file_name', type: 'varchar', length: 512, nullable: true })
  videoFileName: string | null;

  @Column({ name: 'video_asset_id', type: 'varchar', length: 36, nullable: true })
  videoAssetId: string | null;

  @Column({ type: 'varchar', length: 16, default: DraftStatus.DRAFT })
  status: DraftStatus;

  @Column({ type: 'json' })
  payload: PublishDraftPayload;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
