import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { Menu } from '../entities/menu.entity';
import { UserRole } from '../entities/user-role.entity';
import { RoleMenu } from '../entities/role-menu.entity';

type MenuTreeNode = {
  id: string;
  title: string;
  path?: string;
  icon?: string;
  sort: number;
  parentId?: string;
  children: MenuTreeNode[];
};

@UseGuards(JwtAuthGuard)
@Controller('admin/my-menus')
export class MyMenusController {
  constructor(
    @InjectRepository(Menu) private readonly menuRepo: Repository<Menu>,
    @InjectRepository(UserRole) private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(RoleMenu) private readonly roleMenuRepo: Repository<RoleMenu>,
  ) {}

  @Get()
  async myMenus(@CurrentUser() user: User) {
    if (!user?.id) return [];

    const userRoles = await this.userRoleRepo.find({ where: { userId: user.id } });
    const roleIds = userRoles.map((x) => x.roleId);
    if (roleIds.length === 0) return [];

    const roleMenus = await this.roleMenuRepo.find({ where: { roleId: In(roleIds) } });
    const menuIds = [...new Set(roleMenus.map((x) => x.menuId))];
    if (menuIds.length === 0) return [];

    const menus = await this.menuRepo.find({
      where: { id: In(menuIds) },
      order: { sort: 'ASC' as any, createdAt: 'ASC' as any },
    });

    const nodeMap = new Map<string, MenuTreeNode>();
    for (const m of menus) {
      nodeMap.set(m.id, {
        id: m.id,
        title: m.title,
        path: m.path ?? undefined,
        icon: m.icon ?? undefined,
        sort: m.sort,
        parentId: m.parentId ?? undefined,
        children: [],
      });
    }

    const roots: MenuTreeNode[] = [];
    for (const m of menus) {
      const node = nodeMap.get(m.id)!;
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
