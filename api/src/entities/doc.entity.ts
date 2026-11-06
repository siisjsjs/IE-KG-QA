import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'docs' })
export class Doc {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 191, nullable: true })
  folderId: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 255 })
  storageName: string;

  @Column({ type: 'varchar', length: 1024 })
  storagePath: string;

  @Column({ type: 'varchar', length: 64 })
  mimeType: string;

  @Column({ type: 'bigint' })
  size: string;

  @Column({ type: 'varchar', length: 32, default: 'uploaded' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
