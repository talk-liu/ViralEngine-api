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
import { PublishDraft } from '../../publish-draft/entities/publish-draft.entity';
import { PublishBatchStatus } from '../enums/publish-batch-status.enum';
import { PublishBatchItem } from './publish-batch-item.entity';

@Entity('publish_batches')
@Index(['userId', 'finishedAt'])
@Index(['userId', 'clientBatchId'], { unique: true })
export class PublishBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'client_batch_id', type: 'varchar', length: 36, nullable: true })
  clientBatchId: string | null;

  @Column({
    name: 'publish_session_key',
    type: 'bigint',
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) =>
        value === null || value === undefined ? null : Number(value),
    },
  })
  publishSessionKey: number | null;

  @Column({ name: 'draft_id', type: 'varchar', length: 36, nullable: true })
  draftId: string | null;

  @ManyToOne(() => PublishDraft, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'draft_id' })
  draft: PublishDraft | null;

  @Column({ type: 'varchar', length: 16 })
  status: PublishBatchStatus;

  @Column({ name: 'platform_scope', type: 'varchar', length: 32 })
  platformScope: string;

  @Column({ name: 'publish_method', type: 'varchar', length: 64 })
  publishMethod: string;

  @Column({ name: 'video_count', type: 'int' })
  videoCount: number;

  @Column({ name: 'task_count', type: 'int' })
  taskCount: number;

  @Column({ name: 'success_count', type: 'int' })
  successCount: number;

  @Column({ name: 'failure_count', type: 'int' })
  failureCount: number;

  @Column({ name: 'skipped_non_douyin_count', type: 'int', default: 0 })
  skippedNonDouyinCount: number;

  @Column({ name: 'started_at', type: 'datetime' })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'datetime' })
  finishedAt: Date;

  @OneToMany(() => PublishBatchItem, (item) => item.batch)
  items: PublishBatchItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
