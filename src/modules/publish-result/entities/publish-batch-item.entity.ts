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
import { PlatformAccount } from '../../platform/entities/platform-account.entity';
import { PublishBatchItemStatus } from '../enums/publish-batch-item-status.enum';
import type {
  PublishCartItemSnapshot,
  PublishLocationSnapshot,
} from '../types/publish-result-snapshot.type';
import { PublishBatch } from './publish-batch.entity';

@Entity('publish_batch_items')
@Index(['batchId'])
@Index(['userId', 'publishedAt'])
@Index(['accountId', 'publishedAt'])
export class PublishBatchItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'batch_id', type: 'varchar', length: 36 })
  batchId: string;

  @ManyToOne(() => PublishBatch, (batch) => batch.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch: PublishBatch;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'step_key', type: 'varchar', length: 256 })
  stepKey: string;

  @Column({ name: 'entry_client_id', type: 'varchar', length: 128 })
  entryClientId: string;

  @Column({
    name: 'draft_item_client_id',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  draftItemClientId: string | null;

  @Column({ name: 'account_id', type: 'varchar', length: 36 })
  accountId: string;

  @ManyToOne(() => PlatformAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: PlatformAccount;

  @Column({ name: 'platform_id', type: 'varchar', length: 32 })
  platformId: string;

  @Column({ name: 'account_nickname', type: 'varchar', length: 128 })
  accountNickname: string;

  @Column({ name: 'account_open_id', type: 'varchar', length: 128, nullable: true })
  accountOpenId: string | null;

  @Column({ name: 'video_title', type: 'varchar', length: 512 })
  videoTitle: string;

  @Column({ name: 'video_description', type: 'text', nullable: true })
  videoDescription: string | null;

  @Column({ type: 'json', nullable: true })
  topics: string[] | null;

  @Column({ type: 'json', nullable: true })
  tags: string[] | null;

  @Column({ name: 'video_file_name', type: 'varchar', length: 512, nullable: true })
  videoFileName: string | null;

  @Column({
    name: 'video_local_path_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  videoLocalPathHash: string | null;

  @Column({ name: 'douyin_publish_tag', type: 'varchar', length: 64, nullable: true })
  douyinPublishTag: string | null;

  @Column({ name: 'douyin_cart_items', type: 'json', nullable: true })
  douyinCartItems: PublishCartItemSnapshot[] | null;

  @Column({ type: 'json', nullable: true })
  location: PublishLocationSnapshot | null;

  @Column({ name: 'schedule_at', type: 'datetime', nullable: true })
  scheduleAt: Date | null;

  @Column({ type: 'varchar', length: 16 })
  status: PublishBatchItemStatus;

  @Column({ name: 'error_code', type: 'varchar', length: 64, nullable: true })
  errorCode: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'platform_work_id', type: 'varchar', length: 128, nullable: true })
  platformWorkId: string | null;

  @Column({ name: 'platform_work_url', type: 'varchar', length: 512, nullable: true })
  platformWorkUrl: string | null;

  @Column({ name: 'published_at', type: 'datetime' })
  publishedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
