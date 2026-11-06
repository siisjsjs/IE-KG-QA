import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'folders' })
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 191 })
  name: string;

  @Index()
  @Column({ type: 'varchar', length: 191, nullable: true })
  parentId?: string;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
