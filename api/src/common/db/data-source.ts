import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { Menu } from '../../entities/menu.entity';
import { UserRole } from '../../entities/user-role.entity';
import { RoleMenu } from '../../entities/role-menu.entity';
import { Folder } from '../../entities/folder.entity';
import { Doc } from '../../entities/doc.entity';
import { Task } from '../../entities/task.entity';
import { QaLog } from '../../entities/qa-log.entity';
import { QaFeedback } from '../../entities/qa-feedback.entity';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT) ?? 3306,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: [User, Role, Menu, UserRole, RoleMenu, Folder, Doc, Task, QaLog, QaFeedback],
  migrations: ['src/migrations/*{.ts,.js}'],
  synchronize: false,
  migrationsRun: false,
});