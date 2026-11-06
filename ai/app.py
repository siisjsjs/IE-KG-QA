import asyncio
import hashlib
import json
import os
import time
import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import aiosqlite
import httpx
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from neo4j import AsyncGraphDatabase
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    chroma_http_url: str = "http://localhost:8000"
    neo4j_bolt_url: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "neo4j123456"
    redis_url: str = "redis://localhost:6379"

    siliconflow_api_key: Optional[str] = os.getenv("SILICONFLOW_API_KEY")
    siliconflow_base_url: str = os.getenv("SILICONFLOW_BASE_URL", "https://api.siliconflow.cn/v1")
    siliconflow_model: str = os.getenv("SILICONFLOW_MODEL", "deepseek-chat")

    embedding_model: str = os.getenv("SILICONFLOW_EMBEDDING_MODEL", "text-embedding-3-small")

    ingest_max_chunk_chars: int = 1200
    ingest_chunk_overlap_chars: int = 150
    ingest_chunk_concurrency: int = 6

    qa_variant_count: int = 5

    sqlite_cache_path: str = os.getenv("AI_EMBED_CACHE_SQLITE", os.path.join(os.path.dirname(__file__), "embed_cache.sqlite3"))
    chroma_collection: str = os.getenv("CHROMA_COLLECTION", "documents")


SETTINGS = Settings()


QUERY_EXPAND_PROMPT = """你是企业知识库问答系统的查询改写器。
给定用户问题，请生成 {n} 个语义等价但表述不同、可用于检索的查询变体。
要求：
- 只输出严格 JSON：{{\"queries\":[...]}}
- queries 数组长度必须为 {n}
- 每个变体不超过 60 个字
用户问题：{question}
"""

TRIPLE_EXTRACT_PROMPT = """你是信息抽取系统。
给定一段文本（chunk），抽取其中明确陈述的知识三元组 (head, relation, tail)。
要求：
- 只基于文本，不要臆测
- head/tail 尽量使用规范名词短语
- relation 用简洁动词或短语
- 同时为每条三元组提供 evidence（原文中可直接引用的短句）
- 只输出严格 JSON：{{\"triples\":[{{\"h\":...,\"r\":...,\"t\":...,\"evidence\":...}}]}}
文本：{chunk}
"""

QA_PROMPT = """你是企业级知识库问答助手。
你必须且只能依据给定 evidence 回答，不得引入 evidence 之外的信息。
若 evidence 不足以回答，明确说明无法从证据中得出结论。
要求：
- 输出严格 JSON：{{\"answer\":\"...\"}}
- answer 使用中文，尽量简洁、准确。
问题：{question}
证据（evidence 列表，可能来自文档或知识图谱）：
{evidence}
"""


class IngestRequest(BaseModel):
    doc_id: str
    file_path: str


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    progress: float = 0.0
    message: Optional[str] = None


class AskRequest(BaseModel):
    question: str
    top_k_vector: int = Field(default=8, ge=1, le=50)
    top_k_graph: int = Field(default=8, ge=1, le=50)


@dataclass
class Evidence:
    key: str
    payload: Dict[str, Any]


class TaskState:
    def __init__(self) -> None:
        self.status: str = "pending"
        self.progress: float = 0.0
        self.message: Optional[str] = None


TASKS: Dict[str, TaskState] = {}


app = FastAPI(title="AI Service", version="1.0.0")


async def ensure_sqlite() -> None:
    async with aiosqlite.connect(SETTINGS.sqlite_cache_path) as db:
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS embeddings (
                text_hash TEXT PRIMARY KEY,
                model TEXT NOT NULL,
                dim INTEGER NOT NULL,
                vector BLOB NOT NULL,
                created_at INTEGER NOT NULL
            )
            """
        )
        await db.commit()


def _hash_text(text: str) -> str:
    h = hashlib.sha256()
    h.update(text.encode("utf-8"))
    return h.hexdigest()


async def sqlite_get_embedding(text: str, model: str) -> Optional[np.ndarray]:
    text_hash = _hash_text(text + "\n" + model)
    async with aiosqlite.connect(SETTINGS.sqlite_cache_path) as db:
        async with db.execute(
            "SELECT dim, vector FROM embeddings WHERE text_hash=? AND model=?", (text_hash, model)
        ) as cur:
            row = await cur.fetchone()
            if not row:
                return None
            dim, blob = row
            vec = np.frombuffer(blob, dtype=np.float32)
            if int(dim) != int(vec.shape[0]):
                return None
            return vec


async def sqlite_put_embedding(text: str, model: str, vec: np.ndarray) -> None:
    text_hash = _hash_text(text + "\n" + model)
    blob = vec.astype(np.float32).tobytes()
    async with aiosqlite.connect(SETTINGS.sqlite_cache_path) as db:
        await db.execute(
            "INSERT OR REPLACE INTO embeddings(text_hash, model, dim, vector, created_at) VALUES(?,?,?,?,?)",
            (text_hash, model, int(vec.shape[0]), blob, int(time.time())),
        )
        await db.commit()


async def llm_json(prompt: str) -> Dict[str, Any]:
    if not SETTINGS.siliconflow_api_key:
        raise RuntimeError("SILICONFLOW_API_KEY not set")

    url = SETTINGS.siliconflow_base_url.rstrip("/") + "/chat/completions"
    headers = {"Authorization": f"Bearer {SETTINGS.siliconflow_api_key}"}

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            url,
            headers=headers,
            json={
                "model": SETTINGS.siliconflow_model,
                "messages": [
                    {"role": "system", "content": "你是一个严格输出 JSON 的助手。"},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.2,
            },
        )
        try:
            r.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise RuntimeError(f"LLM HTTP {r.status_code}: {r.text}") from e
        data = r.json()
        content = data["choices"][0]["message"]["content"]
        # 容错解析：优先直接解析，失败时尝试从 ```json 代码块中提取
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            import re
            m = re.search(r"```json\s*(.*?)\s*```", content, re.DOTALL | re.IGNORECASE)
            if m:
                try:
                    return json.loads(m.group(1))
                except json.JSONDecodeError as e2:
                    raise RuntimeError(f"Failed to parse JSON from code block: {e2}\nRaw content: {content}") from e2
            raise RuntimeError(f"Failed to parse JSON from LLM response. Raw content: {content}")


async def embed_texts(texts: List[str]) -> List[np.ndarray]:
    model = SETTINGS.embedding_model
    out: List[np.ndarray] = []

    missing: List[Tuple[int, str]] = []
    for i, t in enumerate(texts):
        cached = await sqlite_get_embedding(t, model)
        if cached is None:
            missing.append((i, t))
            out.append(np.zeros((1,), dtype=np.float32))
        else:
            out.append(cached)

    if missing:
        if not SETTINGS.siliconflow_api_key:
            raise RuntimeError("SILICONFLOW_API_KEY not set")
        url = SETTINGS.siliconflow_base_url.rstrip("/") + "/embeddings"
        headers = {"Authorization": f"Bearer {SETTINGS.siliconflow_api_key}"}
        payload = {"model": model, "input": [t for _, t in missing]}
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            vectors = [np.array(item["embedding"], dtype=np.float32) for item in data["data"]]

        for (idx, text), vec in zip(missing, vectors):
            out[idx] = vec
            await sqlite_put_embedding(text, model, vec)

    return out


def split_text(text: str, chunk_chars: int, overlap_chars: int) -> List[str]:
    text = text.replace("\r\n", "\n")
    if not text.strip():
        return []
    chunks: List[str] = []
    start = 0
    n = len(text)
    while start < n:
        end = min(n, start + chunk_chars)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= n:
            break
        start = max(0, end - overlap_chars)
    return chunks


async def read_file_text(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    if ext in [".txt", ".md", ".log"]:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    if ext == ".pdf":
        from pypdf import PdfReader

        reader = PdfReader(file_path)
        parts = []
        for p in reader.pages:
            parts.append(p.extract_text() or "")
        return "\n".join(parts)
    raise ValueError(f"unsupported file type: {ext}")


async def chroma_health() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            base = SETTINGS.chroma_http_url.rstrip("/")
            # Chroma recent versions deprecate v1 API; use v2 heartbeat.
            r = await client.get(base + "/api/v2/heartbeat")
            return r.status_code == 200
    except Exception:
        return False


async def redis_health() -> bool:
    try:
        import redis.asyncio as redis

        r = redis.from_url(SETTINGS.redis_url)
        await r.ping()
        await r.close()
        return True
    except Exception:
        return False


async def neo4j_health() -> bool:
    try:
        driver = AsyncGraphDatabase.driver(
            SETTINGS.neo4j_bolt_url, auth=(SETTINGS.neo4j_user, SETTINGS.neo4j_password)
        )
        async with driver.session() as session:
            await session.run("RETURN 1 AS ok")
        await driver.close()
        return True
    except Exception:
        return False


async def llm_health() -> bool:
    try:
        _ = await llm_json('{"ping": "pong"}')
        return True
    except Exception:
        return False


async def chroma_upsert(doc_id: str, chunk_ids: List[str], texts: List[str], embeddings: List[np.ndarray]) -> None:
    vectors = [v.tolist() for v in embeddings]
    metadatas = [{"doc_id": doc_id, "chunk_id": cid} for cid in chunk_ids]

    payload = {
        "ids": chunk_ids,
        "documents": texts,
        "embeddings": vectors,
        "metadatas": metadatas,
    }

    base = SETTINGS.chroma_http_url.rstrip("/")
    col = SETTINGS.chroma_collection
    url = f"{base}/api/v1/collections/{col}/upsert"

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(url, json=payload)
        r.raise_for_status()


async def chroma_query(query_embeddings: List[np.ndarray], top_k: int) -> List[Dict[str, Any]]:
    base = SETTINGS.chroma_http_url.rstrip("/")
    col = SETTINGS.chroma_collection
    url = f"{base}/api/v1/collections/{col}/query"
    payload = {
        "query_embeddings": [v.tolist() for v in query_embeddings],
        "n_results": top_k,
        "include": ["documents", "metadatas", "distances"],
    }
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(url, json=payload)
        r.raise_for_status()
        data = r.json()

    results: List[Dict[str, Any]] = []
    docs = data.get("documents", [])
    metas = data.get("metadatas", [])
    dists = data.get("distances", [])

    for qi in range(len(docs)):
        for i in range(len(docs[qi])):
            results.append(
                {
                    "document": docs[qi][i],
                    "metadata": metas[qi][i],
                    "distance": dists[qi][i],
                }
            )
    return results


async def neo4j_ensure_schema(driver) -> None:
    cypher = """
    CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE;
    """
    async with driver.session() as session:
        await session.run(cypher)


async def neo4j_upsert_triples(
    driver,
    doc_id: str,
    chunk_id: str,
    triples: List[Dict[str, str]],
) -> None:
    cypher = """
    UNWIND $triples AS t
    MERGE (h:Entity {id: t.h})
    MERGE (r:Relation {id: t.r})
    MERGE (ta:Entity {id: t.t})
    MERGE (h)-[rel:RELATED {type: t.r}]->(ta)
    SET rel.evidence = t.evidence,
        rel.doc_id = $doc_id,
        rel.chunk_id = $chunk_id,
        rel.updated_at = timestamp()
    """
    async with driver.session() as session:
        await session.run(cypher, triples=triples, doc_id=doc_id, chunk_id=chunk_id)


async def neo4j_recall(driver, question: str, top_k: int) -> List[Dict[str, Any]]:
    tokens = [t for t in set(question.replace("\n", " ").split()) if t]
    tokens = tokens[:12]
    cypher = """
    MATCH (a:Entity)-[rel:RELATED]->(b:Entity)
    WHERE any(tok IN $tokens WHERE a.id CONTAINS tok OR b.id CONTAINS tok OR rel.evidence CONTAINS tok)
    RETURN a.id AS h, rel.type AS r, b.id AS t, rel.evidence AS evidence, rel.doc_id AS doc_id, rel.chunk_id AS chunk_id
    LIMIT $limit
    """
    async with driver.session() as session:
        res = await session.run(cypher, tokens=tokens, limit=top_k)
        rows = await res.data()
    return rows


def rrf_fuse(candidates: List[Evidence], k: int = 60) -> List[Evidence]:
    scores: Dict[str, float] = {}
    payloads: Dict[str, Dict[str, Any]] = {}

    for rank, ev in enumerate(candidates, start=1):
        scores[ev.key] = scores.get(ev.key, 0.0) + 1.0 / (k + rank)
        payloads[ev.key] = ev.payload

    fused = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    out: List[Evidence] = []
    for key, sc in fused:
        p = dict(payloads[key])
        p["score"] = float(sc)
        out.append(Evidence(key=key, payload=p))
    return out


@app.on_event("startup")
async def _startup() -> None:
    await ensure_sqlite()


@app.get("/health")
async def health() -> Dict[str, Any]:
    chroma_ok, neo4j_ok, redis_ok, llm_ok = await asyncio.gather(
        chroma_health(), neo4j_health(), redis_health(), llm_health()
    )
    ok = bool(chroma_ok and neo4j_ok and redis_ok and llm_ok)
    return {
        "ok": ok,
        "services": {
            "chroma": chroma_ok,
            "neo4j": neo4j_ok,
            "redis": redis_ok,
            "llm": llm_ok,
        },
    }


@app.post("/tasks/ingest")
async def ingest(req: IngestRequest) -> Dict[str, Any]:
    task_id = str(uuid.uuid4())
    state = TaskState()
    TASKS[task_id] = state

    async def _run() -> None:
        state.status = "running"
        try:
            text = await read_file_text(req.file_path)
            chunks = split_text(text, SETTINGS.ingest_max_chunk_chars, SETTINGS.ingest_chunk_overlap_chars)
            if not chunks:
                state.status = "failed"
                state.message = "empty document"
                return

            driver = AsyncGraphDatabase.driver(
                SETTINGS.neo4j_bolt_url, auth=(SETTINGS.neo4j_user, SETTINGS.neo4j_password)
            )
            await neo4j_ensure_schema(driver)

            sem = asyncio.Semaphore(SETTINGS.ingest_chunk_concurrency)

            async def process_one(i: int, chunk: str) -> None:
                async with sem:
                    chunk_id = f"{req.doc_id}:{i}"
                    vec = (await embed_texts([chunk]))[0]
                    await chroma_upsert(req.doc_id, [chunk_id], [chunk], [vec])

                    triples_json = await llm_json(TRIPLE_EXTRACT_PROMPT.format(chunk=chunk))
                    triples = triples_json.get("triples", [])
                    norm: List[Dict[str, str]] = []
                    for t in triples:
                        h = str(t.get("h", "")).strip()
                        r = str(t.get("r", "")).strip()
                        ta = str(t.get("t", "")).strip()
                        ev = str(t.get("evidence", "")).strip()
                        if h and r and ta and ev:
                            norm.append({"h": h, "r": r, "t": ta, "evidence": ev})
                    if norm:
                        await neo4j_upsert_triples(driver, req.doc_id, chunk_id, norm)

            total = len(chunks)
            done = 0

            async def wrapped(i: int, chunk: str) -> None:
                nonlocal done
                await process_one(i, chunk)
                done += 1
                state.progress = float(done) / float(total)

            await asyncio.gather(*[wrapped(i, c) for i, c in enumerate(chunks)])
            await driver.close()

            state.progress = 1.0
            state.status = "succeeded"
        except Exception as e:
            state.status = "failed"
            state.message = str(e)

    asyncio.create_task(_run())
    return {"task_id": task_id}


@app.get("/tasks/{task_id}")
async def task_status(task_id: str) -> TaskStatusResponse:
    st = TASKS.get(task_id)
    if not st:
        raise HTTPException(status_code=404, detail="task not found")
    return TaskStatusResponse(task_id=task_id, status=st.status, progress=st.progress, message=st.message)


@app.post("/qa/ask")
async def ask(req: AskRequest) -> JSONResponse:
    variants_json = await llm_json(QUERY_EXPAND_PROMPT.format(n=SETTINGS.qa_variant_count, question=req.question))
    variants = variants_json.get("queries", [])
    queries = [req.question] + [str(q) for q in variants if q]

    q_embs = await embed_texts(queries)

    vector_hits = await chroma_query(q_embs, req.top_k_vector)

    driver = AsyncGraphDatabase.driver(
        SETTINGS.neo4j_bolt_url, auth=(SETTINGS.neo4j_user, SETTINGS.neo4j_password)
    )
    kg_hits = await neo4j_recall(driver, req.question, req.top_k_graph)
    await driver.close()

    vector_evs: List[Evidence] = []
    for h in vector_hits:
        md = h.get("metadata") or {}
        doc_id = md.get("doc_id")
        chunk_id = md.get("chunk_id")
        quote = h.get("document")
        key = f"doc::{doc_id}::{chunk_id}"
        vector_evs.append(
            Evidence(
                key=key,
                payload={
                    "source_type": "doc",
                    "doc_id": doc_id,
                    "chunk_id": chunk_id,
                    "quote": quote,
                },
            )
        )

    kg_evs: List[Evidence] = []
    for row in kg_hits:
        triple = f"({row.get('h')},{row.get('r')},{row.get('t')})"
        key = f"kg::{triple}::{row.get('doc_id')}::{row.get('chunk_id')}"
        kg_evs.append(
            Evidence(
                key=key,
                payload={
                    "source_type": "kg",
                    "triple": triple,
                    "evidence": row.get("evidence"),
                    "doc_id": row.get("doc_id"),
                    "chunk_id": row.get("chunk_id"),
                },
            )
        )

    fused = rrf_fuse(vector_evs + kg_evs)

    evidence_for_prompt = []
    citations: List[Dict[str, Any]] = []

    for ev in fused[: max(req.top_k_vector, req.top_k_graph, 16)]:
        p = ev.payload
        if p.get("source_type") == "doc":
            evidence_for_prompt.append(
                {
                    "type": "doc",
                    "doc_id": p.get("doc_id"),
                    "chunk_id": p.get("chunk_id"),
                    "quote": p.get("quote"),
                    "score": p.get("score"),
                }
            )
            citations.append(
                {
                    "source_type": "doc",
                    "doc_id": p.get("doc_id"),
                    "chunk_id": p.get("chunk_id"),
                    "quote": p.get("quote"),
                    "score": float(p.get("score", 0.0)),
                }
            )
        else:
            evidence_for_prompt.append(
                {
                    "type": "kg",
                    "triple": p.get("triple"),
                    "evidence": p.get("evidence"),
                    "score": p.get("score"),
                }
            )
            citations.append(
                {
                    "source_type": "kg",
                    "triple": p.get("triple"),
                    "evidence": p.get("evidence"),
                    "score": float(p.get("score", 0.0)),
                }
            )

    ans_json = await llm_json(QA_PROMPT.format(question=req.question, evidence=json.dumps(evidence_for_prompt, ensure_ascii=False)))
    answer = str(ans_json.get("answer", ""))

    return JSONResponse(
        content={
            "answer": answer,
            "citations": citations,
        }
    )


@app.get("/kg/node_search")
async def kg_node_search(q: str) -> Dict[str, Any]:
    driver = AsyncGraphDatabase.driver(
        SETTINGS.neo4j_bolt_url, auth=(SETTINGS.neo4j_user, SETTINGS.neo4j_password)
    )
    cypher = """
    MATCH (n)
    WHERE n.id CONTAINS $q
    RETURN n.id AS id, labels(n) AS labels
    LIMIT 30
    """
    async with driver.session() as session:
        res = await session.run(cypher, q=q)
        rows = await res.data()
    await driver.close()
    return {"nodes": [{"id": r["id"], "types": r["labels"]} for r in rows]}


@app.get("/kg/subgraph")
async def kg_subgraph(node_id: str, depth: int = 1) -> Dict[str, Any]:
    depth = max(1, min(int(depth), 3))
    driver = AsyncGraphDatabase.driver(
        SETTINGS.neo4j_bolt_url, auth=(SETTINGS.neo4j_user, SETTINGS.neo4j_password)
    )
    cypher = f"""
    MATCH (n:Entity {{id: $id}})
    CALL apoc.path.subgraphAll(n, {{maxLevel: {depth}}}) YIELD nodes, relationships
    RETURN nodes, relationships
    """
    nodes_out: Dict[str, Dict[str, Any]] = {}
    edges_out: List[Dict[str, Any]] = []

    async with driver.session() as session:
        try:
            res = await session.run(cypher, id=node_id)
            row = await res.single()
            if not row:
                await driver.close()
                return {"nodes": [], "edges": []}
            nodes = row["nodes"]
            rels = row["relationships"]

            for n in nodes:
                nid = n.get("id")
                if not nid:
                    continue
                nodes_out[nid] = {"id": nid, "types": list(n.labels)}

            for r in rels:
                edges_out.append(
                    {
                        "source": r.start_node.get("id"),
                        "target": r.end_node.get("id"),
                        "type": r.get("type"),
                        "evidence": r.get("evidence"),
                        "doc_id": r.get("doc_id"),
                        "chunk_id": r.get("chunk_id"),
                    }
                )
        except Exception:
            cypher2 = f"""
            MATCH p=(n:Entity {{id:$id}})-[r:RELATED*1..{depth}]-(:Entity)
            RETURN p
            LIMIT 50
            """
            res = await session.run(cypher2, id=node_id)
            rows = await res.data()
            for rr in rows:
                p = rr.get("p")
                if not p:
                    continue
                for n in p.nodes:
                    nid = n.get("id")
                    if nid:
                        nodes_out[nid] = {"id": nid, "types": list(n.labels)}
                for r in p.relationships:
                    edges_out.append(
                        {
                            "source": r.start_node.get("id"),
                            "target": r.end_node.get("id"),
                            "type": r.get("type"),
                            "evidence": r.get("evidence"),
                            "doc_id": r.get("doc_id"),
                            "chunk_id": r.get("chunk_id"),
                        }
                    )

    await driver.close()
    return {"nodes": list(nodes_out.values()), "edges": edges_out}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
