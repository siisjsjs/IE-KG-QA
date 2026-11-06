# 工业工程知识图谱

基于 **向量检索 + 知识图谱** 的知识库问答系统：上传文档后自动切块、向量化并用大模型抽取三元组写入 Neo4j，提问时双路召回、融合证据后由大模型作答并给出引用。

## 架构

```
web (Next.js, :3000) ──► api (NestJS, :3001) ──► ai (FastAPI, :8001)
                           │                        ├─ ChromaDB  (:8000) 向量检索
                           ├─ MySQL  (:3306)        ├─ Neo4j     (:7687) 知识图谱
                           └─ Neo4j                 └─ SiliconFlow 大模型 API
```

| 目录 | 说明 |
|------|------|
| `web/` | 前端：登录、问答、文档管理、知识图谱、监控、用户/角色/菜单管理 |
| `api/` | 后端：JWT 鉴权、RBAC、文档上传与入库任务、问答日志与反馈、图谱查询、Excel 导入导出 |
| `ai/` | AI 服务：文档切块、Embedding、三元组抽取、混合检索问答 |
| `deploy/` | `docker-compose.yml`：MySQL、Neo4j、ChromaDB、Redis |

## 环境要求

- Node.js 20+
- Python 3.12
- Docker Desktop
- SiliconFlow API Key（https://siliconflow.cn）

## 启动步骤

### 1. 启动基础服务

```bash
cd deploy
docker compose up -d
```

> 若本机已安装 MySQL / Redis 并占用 3306 / 6379 端口，请先停掉本机服务或修改端口映射。

### 2. 初始化数据库

```bash
docker exec -i mysql mysql -uapp -papp123456 app < api/src/migrations/001-initial.sql
```

### 3. 配置环境变量

```bash
cp ai/.env.example  ai/.env       # 填入 SILICONFLOW_API_KEY
cp api/.env.example api/.env      # 修改 JWT_SECRET 等
cp web/.env.example web/.env.local
```

### 4. 启动 AI 服务

```bash
cd ai
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python app.py                     # http://localhost:8001
```

### 5. 启动后端

```bash
cd api
npm install
npm run start:dev                 # http://localhost:3001
```

### 6. 启动前端

```bash
cd web
npm install
npm run dev                       # http://localhost:3000
```

默认管理员账号见 `api/.env` 中的 `ADMIN_EMAIL` / `ADMIN_PASSWORD`。
