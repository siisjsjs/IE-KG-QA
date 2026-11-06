import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'role_menus' })
export class RoleMenu {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 191 })
  roleId: string;

  @Index()
  @Column({ type: 'varchar', length: 191 })
  menuId: string;

  @CreateDateColumn()
  createdAt: Date;
}