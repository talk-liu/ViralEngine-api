import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { BindStatus } from '../enums/bind-status.enum';
import { PlatformId } from '../enums/platform-id.enum';
import { PlatformToken } from './platform-token.entity';

@Entity('platform_accounts')
@Index(['userId', 'platformId', 'openId'], { unique: true })
export class PlatformAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'platform_id', type: 'varchar', length: 32 })
  platformId: PlatformId;

  @Column({ name: 'open_id', type: 'varchar', length: 128 })
  openId: string;

  @Column({ type: 'varchar', length: 128, default: '' })
  nickname: string;

  @Column({ name: 'avatar_url', type: 'varchar', length: 512, default: '' })
  avatarUrl: string;

  @Column({ type: 'varchar', length: 16, default: BindStatus.BOUND })
  status: BindStatus;

  @Column({ name: 'bound_at', type: 'datetime', nullable: true })
  boundAt: Date | null;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'last_error', type: 'varchar', length: 512, nullable: true })
  lastError: string | null;

  @OneToOne(() => PlatformToken, (token) => token.account)
  token: PlatformToken;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
