import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'user_roles' })
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 191 })
  userId: string;

  @Index()
  @Column({ type: 'varchar', length: 191 })
  roleId: string;

  @CreateDateColumn()
  createdAt: Date;
}
