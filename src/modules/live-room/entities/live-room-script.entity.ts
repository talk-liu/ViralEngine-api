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
import { LiveRoom } from './live-room.entity';

@Entity('live_room_scripts')
@Index(['roomId', 'sortOrder'])
export class LiveRoomScript {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'room_id', type: 'varchar', length: 36 })
  roomId: string;

  @ManyToOne(() => LiveRoom, (room) => room.scripts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: LiveRoom;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
