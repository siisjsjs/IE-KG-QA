import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { AiService } from '../common/ai/ai.service';
import { Neo4jService } from '../kg/neo4j.service';

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly cfg: ConfigService,
    private readonly ai: AiService,
    private readonly neo4j: Neo4jService,
  ) {}

  async checkMysql() {
    try {
      await this.ds.query('SELECT 1');
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? String(e) };
    }
  }

  async checkRedis() {
    const enabled = this.cfg.get<boolean>('REDIS_ENABLED') ?? false;
    if (!enabled) return { ok: true, note: 'disabled' };
    try {
      const url = this.cfg.get<string>('REDIS_URL') ?? 'redis://127.0.0.1:6379';
      const client = new Redis(url);
      const pong = await client.ping();
      await client.quit();
      return { ok: true, pong };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? String(e) };
    }
  }

  async checkAi() {
    const res = await this.ai.health();
    return res;
  }

  async checkNeo4j() {
    try {
      const res = await this.neo4j.verifyConnectivity();
      return res;
    } catch (e: any) {
      return { ok: false, error: e?.message ?? String(e) };
    }
  }

  async checkChroma() {
    const url = this.cfg.get<string>('CHROMA_URL') ?? 'http://127.0.0.1:8000';
    try {
      const res = await fetch(`${url}/api/v2/heartbeat`);
      if (!res.ok) return { ok: false, status: res.status };
      const data = await res.json().catch(() => null);
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? String(e), url };
    }
  }
}
