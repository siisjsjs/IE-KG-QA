import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev',
    });
  }

  async validate(payload: any) {
    const user = await this.authService.getUserById(payload.sub);
    if (!user || !user.isActive) throw new Error('invalid user');
    return { id: user.id, username: user.username, isAdmin: user.isAdmin };
  }
}