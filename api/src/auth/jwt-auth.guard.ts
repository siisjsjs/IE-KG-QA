import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly cfg: ConfigService) {
    super();
  }

  canActivate(context: any) {
    const enabledRaw = this.cfg.get<string>('AUTH_ENABLED');
    const enabled = enabledRaw == null ? true : String(enabledRaw).toLowerCase() !== 'false';
    if (!enabled) return true;
    return super.canActivate(context) as any;
  }
}
