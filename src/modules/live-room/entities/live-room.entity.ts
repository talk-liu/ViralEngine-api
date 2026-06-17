import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LiveRoomScript } from './live-room-script.entity';

@Entity('live_rooms')
export class LiveRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'varchar', length: 1024 })
  url: string;

  @OneToMany(() => LiveRoomScript, (script) => script.room, {
    cascade: true,
  })
  scripts: LiveRoomScript[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
