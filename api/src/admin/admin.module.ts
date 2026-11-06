import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Menu } from '../entities/menu.entity';
import { UserRole } from '../entities/user-role.entity';
import { RoleMenu } from '../entities/role-menu.entity';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { RolesController } from './roles/roles.controller';
import { RolesService } from './roles/roles.service';
import { MenusController } from './menus/menus.controller';
import { MenusService } from './menus/menus.service';
import { MyMenusController } from './my-menus.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Menu, UserRole, RoleMenu])],
  controllers: [UsersController, RolesController, MenusController, MyMenusController],
  providers: [UsersService, RolesService, MenusService],
})
export class AdminModule {}