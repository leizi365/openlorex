# Wiki Backend

Python FastAPI 后端，为 Wiki 前端提供 REST API。采用 YAML 分层配置，支持本地开发与 Docker 独立部署。

## 架构

```
Browser / Frontend
        │
        ▼  HTTP  /api/v1/*
┌───────────────────────────────────────┐
│  FastAPI (app/main.py)                │
│  ├── CORSMiddleware                   │
│  ├── JwtAuthMiddleware  鉴权/白名单    │
│  └── Exception Handlers               │
│         │                             │
│         ▼                             │
│  api/v1/*.py          路由层           │
│         │                             │
│         ▼                             │
│  services/*.py        业务逻辑层       │
│         │                             │
│         ▼                             │
│  models/ + SQLAlchemy 数据访问层       │
└─────────┬─────────────────────────────┘
          │
          ▼
     MySQL 8.x
          │
          ▼
     uploads/  本地文件存储
```

**请求链路**：客户端 → JWT 中间件（白名单/可选鉴权/强制鉴权）→ 路由 → Service → Model/DB → 统一 JSON 响应 `{ code, message, data }`。

**分层约定**：

| 层级 | 目录 | 职责 |
|------|------|------|
| 路由 | `app/api/v1/` | 参数解析、依赖注入、调用 Service、包装 `success()` |
| 业务 | `app/services/` | 权限校验、事务、领域逻辑 |
| 数据 | `app/models/` | SQLAlchemy ORM，内部 `id` / 对外 `code` / 软删除 `deleted` |
| 核心 | `app/core/` | 配置、数据库、安全、异常、错误码 |
| 中间件 | `app/middleware/` | JWT 鉴权、全局异常处理 |

**鉴权策略**（`JwtAuthMiddleware`）：

- **公开**：`/health`、`/api/v1/auth/register|login`、`/api/v1/public/*`、邀请预览等
- **可选**：`GET /api/v1/pages/{code}`（公开页未登录可读）、`GET /api/v1/auth/me`
- **其余**：需 `Authorization: Bearer <token>`

## 目录结构

```
backend/
├── config/                 # YAML 多环境配置
│   ├── default.yaml        # 默认配置
│   ├── dev.yaml            # APP_ENV=dev
│   ├── test.yaml           # APP_ENV=test
│   └── prod.yaml           # APP_ENV=prod
├── sql/
│   └── schema.sql          # 数据库初始化脚本
├── app/
│   ├── main.py             # 应用入口 + run_server()
│   ├── __main__.py         # python -m app
│   ├── api/v1/             # REST 路由
│   ├── core/               # 配置、DB、安全
│   ├── middleware/         # JWT、异常
│   ├── models/             # ORM 模型
│   ├── schemas/            # Pydantic 请求/响应
│   ├── services/           # 业务逻辑
│   └── utils/
├── uploads/                # 上传文件（运行时生成）
├── Dockerfile
├── requirements.txt
└── README.md
```

## 配置

配置加载逻辑见 `app/core/config.py`：`default.yaml` 为基础，再与 `config/{APP_ENV}.yaml` 深度合并，最后应用环境变量覆盖。

### 配置文件

| 文件 | 何时生效 |
|------|----------|
| `config/default.yaml` | 始终加载 |
| `config/dev.yaml` | `APP_ENV=dev`（默认） |
| `config/prod.yaml` | `APP_ENV=prod` |

### 主要配置项

| 配置路径 | 说明 | 默认值 |
|----------|------|--------|
| `app.api_prefix` | API 前缀 | `/api/v1` |
| `app.debug` | 调试模式（影响热重载） | `false` |
| `app.frontend_url` | 前端地址（CORS 等） | `http://localhost:5173` |
| `server.host` | 监听地址 | `0.0.0.0` |
| `server.port` | 监听端口 | `8001` |
| `database.*` | MySQL 连接 | 见 default.yaml |
| `jwt.secret_key` | JWT 签名密钥 | 必须在 prod 通过环境变量注入 |
| `upload.dir` | 上传目录 | `uploads` |
| `upload.max_size_mb` | 单文件大小上限 | `50` |
| `cors.origins` | 允许跨域来源 | 本地 dev 端口 |

### 环境变量覆盖

优先级：**环境变量 > `{APP_ENV}.yaml` > `default.yaml`**

| 变量 | 覆盖项 |
|------|--------|
| `APP_ENV` | 选择配置文件（`dev` / `prod` / `test`） |
| `JWT_SECRET_KEY` | `jwt.secret_key` |
| `DB_HOST` | `database.host` |
| `DB_PORT` | `database.port` |
| `DB_USER` | `database.user` |
| `DB_PASSWORD` | `database.password` |
| `DB_NAME` | `database.name` |
| `SERVER_HOST` | `server.host` |
| `SERVER_PORT` | `server.port` |

生产环境至少设置 `APP_ENV=prod`、`JWT_SECRET_KEY`，数据库连接建议全部通过环境变量注入，避免密钥写入仓库。

## 运行方式

### 前置条件

- Python 3.12+
- MySQL 8.x（已执行 `sql/schema.sql` 或等效迁移）

### 本地开发

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export APP_ENV=dev               # 可选，默认 dev
python -m app.main               # 或 python -m app
```

服务默认监听 `http://0.0.0.0:8001`。健康检查：

```bash
curl http://127.0.0.1:8001/health
```

**注意**：直接运行 `uvicorn app.main:app --reload` **不会**读取 YAML 中的 `server.port`，仍默认 8000。请使用 `python -m app.main`；若必须用 uvicorn CLI，需显式传参：

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

PyPI 不稳定时可使用国内镜像：

```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn
```

### 生产运行（非 Docker）

```bash
export APP_ENV=prod
export JWT_SECRET_KEY=your-production-secret
export DB_HOST=your-db-host
export DB_PASSWORD=your-db-password
python -m app.main
```

## 部署

前后端**各自独立部署**时，后端只需对外（或对内网 nginx）暴露 API 端口；前端通过 nginx 反代 `/api` 或配置独立 API 域名。

### 方式一：Docker 单服务

在 `backend/` 目录构建并运行：

```bash
cd backend
docker build -t wiki-backend .

docker run -d \
  --name wiki-backend \
  -p 8001:8001 \
  -e APP_ENV=prod \
  -e JWT_SECRET_KEY=your-secret \
  -e DB_HOST=your-db-host \
  -e DB_USER=wiki \
  -e DB_PASSWORD=your-password \
  -e DB_NAME=wiki \
  -v wiki-uploads:/app/uploads \
  wiki-backend
```

容器内执行 `python -m app.main`，监听 8001，上传文件持久化到 volume。

### 方式二：docker compose（仓库根目录）

仓库根目录的 `docker-compose.yml` 同时编排前后端，适合一键部署：

```bash
cd ..   # 项目根目录 wiki/
cp .env.example .env
# 编辑 .env：JWT_SECRET_KEY、DB_HOST、DB_PASSWORD

docker compose up -d --build
```

- 后端容器名 `backend`，端口 8001，**不映射到宿主机**（仅容器网络内访问）
- 前端 nginx 将 `/api` 反代到 `http://backend:8001`

自带 MySQL（可选 profile）：

```bash
# .env 中 DB_HOST=mysql
docker compose --profile with-db up -d --build
```

首次启动会自动执行 `sql/schema.sql` 初始化数据库。

已有数据库若需支持封面图片 URL，执行一次：

```bash
mysql -u root -p wiki < backend/sql/patches/20260715_widen_cover_color.sql
```

### 方式三：反向代理（生产推荐）

后端置于 nginx / Caddy 之后，仅暴露 HTTPS：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 50m;
}
```

此时前端 `api.baseUrl` 设为同源 `/api/v1` 即可。

## 数据约定

- `id`：BIGINT 内部主键，不对外暴露
- `code`：对外业务编码（`u_` / `p_` / `a_` 前缀）
- `deleted`：软删除标记
- `version`：页面乐观锁版本号

统一响应格式：

```json
{ "code": 0, "message": "success", "data": {} }
```

`PATCH /pages/{code}` 需携带 `version`；冲突返回 `code: 30004`。

## API 概览

### 认证 `/api/v1/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/register` | 注册 |
| POST | `/login` | 登录 |
| GET | `/me` | 当前用户 |
| PATCH | `/profile` | 修改昵称 |
| PATCH | `/password` | 修改密码 |

### 页面 `/api/v1/pages`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/tree` | 我的页面树 |
| GET | `/shared` | 共享给我的页面 |
| GET | `/{code}` | 页面详情（公开页可未登录） |
| GET/PUT | `/{code}/permissions` | ACL 管理 |
| GET/PUT | `/{code}/public` | 对外公开开关 |
| POST | `/` | 创建页面 |
| PATCH | `/{code}` | 更新（含乐观锁） |
| DELETE | `/{code}` | 软删除 |
| POST | `/{code}/move` | 移动页面 |

### 公开访问 `/api/v1/public`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/pages/{code}` | 公开页内容 |
| GET | `/pages/{code}/tree` | 公开页目录树（分享根及其子页面） |
| GET | `/assets/{code}/download` | 公开资源下载 |

### 社区 `/api/v1/communities`

创建/管理社区、成员、邀请、加入申请、社区共享页面等，均需登录。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `` | 创建社区（`is_public` 选择开放/私密） |
| GET | `` | 我加入的社区 |
| GET | `/public` | 开放社区列表（所有人可见） |
| GET | `/{code}` | 社区详情（开放社区非成员也可查看基本信息） |
| POST | `/{code}/applications` | 申请加入开放社区 |
| GET | `/{code}/applications` | 待审核加入申请（创建者） |
| POST | `/{code}/applications/{application_code}/approve` | 同意申请（创建者） |
| POST | `/{code}/applications/{application_code}/reject` | 拒绝申请（创建者） |

### 邀请 `/api/v1/invitations`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/mine` | 我的待接受邀请 |
| GET | `/{invite_code}` | 邀请预览（公开） |
| POST | `/accept` | 接受邀请 |

### 资源 `/api/v1/assets`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/upload` | 上传文件 |
| GET | `/{code}/download` | 下载 |
| DELETE | `/{code}` | 软删除 |

完整路由定义见 `app/api/v1/` 各模块。
