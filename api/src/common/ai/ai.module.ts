import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        baseURL: cfg.get<string>('AI_BASE_URL') ?? 'http://localhost:8001',
        timeout: Number(cfg.get<string>('AI_TIMEOUT_MS') ?? 60000),
      }),
    }),
  ],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
