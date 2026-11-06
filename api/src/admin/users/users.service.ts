import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  async list() {
    return this.repo.find({ order: { createdAt: 'DESC' as any } });
  }

  async get(id: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('user not found');
    return user;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.repo.findOne({ where: { username: dto.username } });
    if (exists) throw new BadRequestException('username exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.repo.create({
      username: dto.username,
      passwordHash,
      isActive: dto.isActive ?? true,
      isAdmin: dto.isAdmin ?? false,
    });
    return this.repo.save(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.get(id);

    if (dto.username && dto.username !== user.username) {
      const exists = await this.repo.findOne({ where: { username: dto.username } });
      if (exists) throw new BadRequestException('username exists');
      user.username = dto.username;
    }

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.isAdmin !== undefined) user.isAdmin = dto.isAdmin;

    return this.repo.save(user);
  }

  async remove(id: string) {
    const user = await this.get(id);
    await this.repo.remove(user);
    return { ok: true };
  }
}
