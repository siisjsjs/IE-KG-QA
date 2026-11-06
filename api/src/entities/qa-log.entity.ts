import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'qa_logs' })
export class QaLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 191, nullable: true })
  userId?: string;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text', nullable: true })
  answer?: string;

  @Column({ type: 'text', nullable: true })
  aiResponseJson?: string;

  @CreateDateColumn()
  createdAt: Date;
}
