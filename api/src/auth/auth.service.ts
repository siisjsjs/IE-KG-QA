import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly cfg: ConfigService,
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  private async ensureAdminSeed() {
    const adminUsername = this.cfg.get<string>('ADMIN_EMAIL') ?? 'admin@example.com';
    const adminPassword = this.cfg.get<string>('ADMIN_PASSWORD') ?? 'admin123456';

    let admin = await this.users.findOne({ where: { username: adminUsername } });
    if (!admin) {
      const hash = await bcrypt.hash(adminPassword, 10);
      admin = this.users.create({
        username: adminUsername,
        passwordHash: hash,
        isActive: true,
        isAdmin: true,
      });
      await this.users.save(admin);
    }
  }

  async login(dto: LoginDto) {
    await this.ensureAdminSeed();

    const user = await this.users.findOne({ where: { username: dto.username } });
    if (!user || !user.isActive) throw new UnauthorizedException('invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('invalid credentials');

    const payload = { sub: user.id, username: user.username, isAdmin: user.isAdmin };
    const accessToken = await this.jwt.signAsync(payload);

    return { accessToken };
  }

  async getUserById(id: string) {
    return this.users.findOne({ where: { id } });
  }
}
