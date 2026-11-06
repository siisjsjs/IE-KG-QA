import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly service: HealthService) {}

  @Get('health')
  async health() {
    const [mysql, redis, ai, neo4j, chroma] = await Promise.all([
      this.service.checkMysql(),
      this.service.checkRedis(),
      this.service.checkAi(),
      this.service.checkNeo4j(),
      this.service.checkChroma(),
    ]);

    return {
      ok: true,
      message: 'api ok',
      mysql,
      redis,
      ai,
      neo4j,
      chroma,
    };
  }
}
