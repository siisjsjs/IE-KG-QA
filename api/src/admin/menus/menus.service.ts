import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menu } from '../../entities/menu.entity';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

@Injectable()
export class MenusService {
  constructor(@InjectRepository(Menu) private readonly repo: Repository<Menu>) {}

  async list() {
    return this.repo.find({ order: { sort: 'ASC' as any, createdAt: 'ASC' as any } });
  }

  async get(id: string) {
    const menu = await this.repo.findOne({ where: { id } });
    if (!menu) throw new NotFoundException('menu not found');
    return menu;
  }

  async create(dto: CreateMenuDto) {
    if (dto.parentId) {
      const parent = await this.repo.findOne({ where: { id: dto.parentId } });
      if (!parent) throw new BadRequestException('parent menu not found');
    }

    const menu = this.repo.create({
      title: dto.title,
      path: dto.path ?? null,
      icon: dto.icon ?? null,
      sort: typeof dto.sort === 'number' ? dto.sort : 0,
      parentId: dto.parentId ?? null,
    } as any);
    return this.repo.save(menu);
  }

  async update(id: string, dto: UpdateMenuDto) {
    const menu = await this.get(id);

    if (dto.parentId !== undefined) {
      if (dto.parentId) {
        if (dto.parentId === id) throw new BadRequestException('parentId cannot be self');
        const parent = await this.repo.findOne({ where: { id: dto.parentId } });
        if (!parent) throw new BadRequestException('parent menu not found');
      }
      menu.parentId = dto.parentId ?? null;
    }

    if (dto.title !== undefined) menu.title = dto.title;
    if (dto.path !== undefined) menu.path = dto.path;
    if (dto.icon !== undefined) menu.icon = dto.icon;
    if (dto.sort !== undefined) menu.sort = dto.sort;

    return this.repo.save(menu);
  }

  async remove(id: string) {
    const menu = await this.get(id);
    await this.repo.remove(menu);
    return { ok: true };
  }
}
