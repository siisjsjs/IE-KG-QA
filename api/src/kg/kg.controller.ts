import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Neo4jService } from './neo4j.service';

@UseGuards(JwtAuthGuard)
@Controller('kg')
export class KgController {
  constructor(private readonly neo4j: Neo4jService) {}

  @Get('search')
  async search(@Query('q') q: string, @Query('limit') limit?: string) {
    const l = Math.min(Math.max(parseInt(limit ?? '20', 10) || 20, 1), 100);
    return this.neo4j.searchNodes(q ?? '', l);
  }

  @Get('subgraph')
  async subgraph(@Query('center') center: string, @Query('depth') depth?: string, @Query('limit') limit?: string) {
    const d = Math.min(Math.max(parseInt(depth ?? '1', 10) || 1, 1), 3);
    const l = Math.min(Math.max(parseInt(limit ?? '200', 10) || 200, 50), 1000);
    return this.neo4j.getSubgraph(center, d, l);
  }
}
