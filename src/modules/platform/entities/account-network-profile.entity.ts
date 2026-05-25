import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlatformAccount } from './platform-account.entity';
import { ProxyType } from '../enums/proxy-type.enum';

@Entity('account_network_profiles')
export class AccountNetworkProfile {
  @PrimaryColumn({ name: 'account_id', type: 'varchar', length: 36 })
  accountId: string;

  @OneToOne(() => PlatformAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: PlatformAccount;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ name: 'proxy_type', type: 'varchar', length: 16, default: ProxyType.NONE })
  proxyType: ProxyType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  host: string | null;

  @Column({ type: 'int', nullable: true })
  port: number | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  username: string | null;

  @Column({ type: 'text', nullable: true })
  password: string | null;

  @Column({ name: 'region_label', type: 'varchar', length: 128, nullable: true })
  regionLabel: string | null;

  @Column({ name: 'last_ip', type: 'varchar', length: 64, nullable: true })
  lastIp: string | null;

  @Column({ name: 'last_region', type: 'varchar', length: 128, nullable: true })
  lastRegion: string | null;

  @Column({ name: 'last_checked_at', type: 'datetime', nullable: true })
  lastCheckedAt: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
