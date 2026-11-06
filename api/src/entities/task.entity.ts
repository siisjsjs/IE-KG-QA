import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'tasks' })
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  type: string;

  @Index()
  @Column({ type: 'varchar', length: 191, nullable: true })
  docId: string;

  @Column({ type: 'text', nullable: true })
  requestJson: string;

  @Column({ type: 'text', nullable: true })
  responseJson: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  aiTaskId: string;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
