import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { DraftAssetKind } from '../enums/draft-asset-kind.enum';
import { PublishDraft } from './publish-draft.entity';

@Entity('publish_draft_assets')
@Index(['draftId', 'kind', 'platformId'])
export class PublishDraftAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'draft_id', type: 'varchar', length: 36 })
  draftId: string;

  @ManyToOne(() => PublishDraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'draft_id' })
  draft: PublishDraft;

  @Column({ type: 'varchar', length: 32 })
  kind: DraftAssetKind;

  @Column({ name: 'platform_id', type: 'varchar', length: 32, nullable: true })
  platformId: string | null;

  @Column({ name: 'storage_key', type: 'varchar', length: 1024 })
  storageKey: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 128 })
  mimeType: string;

  @Column({ name: 'file_name', type: 'varchar', length: 512 })
  fileName: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
