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
import { BindSessionStatus } from '../enums/bind-session-status.enum';
import { PlatformId } from '../enums/platform-id.enum';

@Entity('oauth_bind_sessions')
@Index(['state'], { unique: true })
export class OAuthBindSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'platform_id', type: 'varchar', length: 32 })
  platformId: PlatformId;

  @Column({ type: 'varchar', length: 128 })
  state: string;

  @Column({ type: 'varchar', length: 16, default: BindSessionStatus.PENDING })
  status: BindSessionStatus;

  @Column({ name: 'account_id', type: 'varchar', length: 36, nullable: true })
  accountId: string | null;

  @Column({ name: 'error_message', type: 'varchar', length: 512, nullable: true })
  errorMessage: string | null;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
