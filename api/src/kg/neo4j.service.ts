import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver } from 'neo4j-driver';

@Injectable()
export class Neo4jService {
  private driver: Driver;

  constructor(private readonly cfg: ConfigService) {
    const uri = this.cfg.get<string>('NEO4J_URI') ?? 'neo4j://127.0.0.1:7687';
    const user = this.cfg.get<string>('NEO4J_USER') ?? 'neo4j';
    const pass = this.cfg.get<string>('NEO4J_PASS') ?? 'neo4j123456';
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, pass));
  }

  async verifyConnectivity() {
    await this.driver.verifyConnectivity();
    return { ok: true };
  }

  private database() {
    return this.cfg.get<string>('NEO4J_DATABASE') ?? undefined;
  }

  async upsertTriples(triples: Array<{ subject: string; predicate: string; object: string }>) {
    const session = this.driver.session({ database: this.database() });
    try {
      const tx = session.beginTransaction();
      for (const t of triples) {
        await tx.run(
          `MERGE (s:Entity {name:$s})
           MERGE (o:Entity {name:$o})
           MERGE (s)-[r:REL {name:$p}]->(o)`,
          { s: t.subject, p: t.predicate, o: t.object },
        );
      }
      await tx.commit();
      return { ok: true, count: triples.length };
    } finally {
      await session.close();
    }
  }

  async exportTriples(limit = 5000) {
    const session = this.driver.session({ database: this.database() });
    try {
      const res = await session.run(
        `MATCH (s:Entity)-[r:REL]->(o:Entity)
         RETURN s.name as subject, r.name as predicate, o.name as object
         LIMIT $limit`,
        { limit: neo4j.int(limit) },
      );
      return res.records.map((r) => ({
        subject: r.get('subject'),
        predicate: r.get('predicate'),
        object: r.get('object'),
      }));
    } finally {
      await session.close();
    }
  }

  async searchNodes(q: string, limit = 20) {
    const query = (q ?? '').trim();
    if (!query) return [];

    const session = this.driver.session({ database: this.database() });
    try {
      const res = await session.run(
        `MATCH (n:Entity)
         WHERE toLower(n.name) CONTAINS toLower($q)
         RETURN n.name as name, labels(n) as labels
         LIMIT $limit`,
        { q: query, limit: neo4j.int(limit) },
      );
      return res.records.map((r) => ({
        name: r.get('name'),
        labels: r.get('labels'),
      }));
    } finally {
      await session.close();
    }
  }

  async getSubgraph(center: string, depth = 1, limit = 200) {
    const c = (center ?? '').trim();
    if (!c) return { nodes: [], edges: [] };

    const d = Math.min(Math.max(depth, 1), 3);
    const l = Math.min(Math.max(limit, 50), 1000);

    const session = this.driver.session({ database: this.database() });
    try {
      const cypher = `MATCH p=(c:Entity {name:$center})-[*1..${d}]-(n) RETURN DISTINCT nodes(p) as nodes, relationships(p) as rels LIMIT $limit`;
      const res = await session.run(cypher, { center: c, limit: neo4j.int(l) });

      const nodeMap = new Map<string, { id: string; name: any; labels: string[] }>();
      const edgeMap = new Map<string, any>();

      for (const rec of res.records) {
        const nodes = rec.get('nodes') as any[];
        const rels = rec.get('rels') as any[];

        for (const n of nodes) {
          const id = String(n.elementId);
          if (!nodeMap.has(id)) {
            nodeMap.set(id, {
              id,
              name: n.properties?.name,
              labels: n.labels ?? [],
            });
          }
        }

        for (const r of rels) {
          const id = String(r.elementId);
          if (!edgeMap.has(id)) {
            edgeMap.set(id, {
              id,
              source: String(r.startNodeElementId),
              target: String(r.endNodeElementId),
              name: r.properties?.name,
              type: r.type,
            });
          }
        }
      }

      return { nodes: Array.from(nodeMap.values()), edges: Array.from(edgeMap.values()) };
    } finally {
      await session.close();
    }
  }
}
