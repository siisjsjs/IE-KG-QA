import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Folder } from '../../entities/folder.entity';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

@Injectable()
export class FoldersService {
  constructor(@InjectRepository(Folder) private readonly repo: Repository<Folder>) {}

  async list() {
    return this.repo.find({ order: { sort: 'ASC' as any, createdAt: 'ASC' as any } });
  }

  async get(id: string) {
    const folder = await this.repo.findOne({ where: { id } });
    if (!folder) throw new NotFoundException('folder not found');
    return folder;
  }

  async create(dto: CreateFolderDto) {
    const folder = this.repo.create({ name: dto.name, parentId: dto.parentId, sort: 0 });
    return this.repo.save(folder);
  }

  async update(id: string, dto: UpdateFolderDto) {
    const folder = await this.get(id);
    if (dto.name !== undefined) folder.name = dto.name;
    if (dto.parentId !== undefined) folder.parentId = dto.parentId;
    return this.repo.save(folder);
  }

  async remove(id: string) {
    const folder = await this.get(id);
    await this.repo.remove(folder);
    return { ok: true };
  }
}
