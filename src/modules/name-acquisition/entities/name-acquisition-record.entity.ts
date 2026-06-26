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

@Entity('name_acquisition_records')
@Index(['userId', 'createdAt'])
@Index('UQ_name_acquisition_records_user_url_hash', ['userId', 'urlHash'], {
  unique: true,
})
export class NameAcquisitionRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 128, default: '' })
  region: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ name: 'url_hash', type: 'char', length: 64 })
  urlHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
