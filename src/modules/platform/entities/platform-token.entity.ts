import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlatformAccount } from './platform-account.entity';

@Entity('platform_tokens')
export class PlatformToken {
  @PrimaryColumn({ name: 'account_id', type: 'varchar', length: 36 })
  accountId: string;

  @OneToOne(() => PlatformAccount, (account) => account.token, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account: PlatformAccount;

  @Column({ name: 'access_token', type: 'text' })
  accessToken: string;

  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string | null;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'refresh_expires_at', type: 'datetime', nullable: true })
  refreshExpiresAt: Date | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  scope: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
