import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(@InjectRepository(Role) private readonly repo: Repository<Role>) {}

  async list() {
    return this.repo.find({ order: { createdAt: 'DESC' as any } });
  }

  async get(id: string) {
    const role = await this.repo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('role not found');
    return role;
  }

  async create(dto: CreateRoleDto) {
    const exists = await this.repo.findOne({ where: { name: dto.name } });
    if (exists) throw new BadRequestException('role name exists');

    const role = this.repo.create(dto);
    return this.repo.save(role);
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.get(id);

    if (dto.name && dto.name !== role.name) {
      const exists = await this.repo.findOne({ where: { name: dto.name } });
      if (exists) throw new BadRequestException('role name exists');
      role.name = dto.name;
    }

    if (dto.description !== undefined) role.description = dto.description;

    return this.repo.save(role);
  }

  async remove(id: string) {
    const role = await this.get(id);
    await this.repo.remove(role);
    return { ok: true };
  }
}