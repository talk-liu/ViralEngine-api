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
import { MediaJobStatus } from '../enums/media-job-status.enum';
import { MediaJobType } from '../enums/media-job-type.enum';

@Entity('media_jobs')
@Index(['userId', 'createdAt'])
@Index(['status', 'createdAt'])
export class MediaJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 32 })
  type: MediaJobType;

  @Column({ type: 'varchar', length: 16, default: MediaJobStatus.PENDING })
  status: MediaJobStatus;

  @Column({ name: 'input_key', type: 'varchar', length: 512, nullable: true })
  inputKey: string | null;

  @Column({ name: 'output_key', type: 'varchar', length: 512, nullable: true })
  outputKey: string | null;

  @Column({ type: 'json', nullable: true })
  params: Record<string, unknown> | null;

  @Column({ name: 'progress', type: 'tinyint', unsigned: true, default: 0 })
  progress: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'started_at', type: 'datetime', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date | null;
}
