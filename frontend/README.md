# Wiki Frontend

React + Vite + TypeScript 前端，基于 Plate.js 的块编辑器 Wiki 应用。

## 架构

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ router.tsx  │→ │ AuthProvider │→ │ PagesProvider │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│         │                │                  │           │
│         ▼                ▼                  ▼           │
│  pages/           features/auth/     features/pages/    │
│  components/      lib/api/auth.ts    page-context.tsx   │
│                                         │               │
│                                         ▼               │
│                              lib/api/client.ts          │
│                              (fetch + JWT)              │
└────────────────────────────┬────────────────────────────┘
                             │
              开发: Vite proxy /api → backend:8001
              生产: nginx 同源反代 /api → backend:8001
                             │
                             ▼
                      Backend REST API
                      /api/v1/*
```

**技术栈**：React 19、Vite 7、TypeScript、Tailwind CSS 4、Plate.js（块编辑器）、React Router 7。

**核心模块**：

| 模块 | 路径 | 职责 |
|------|------|------|
| 路由 | `src/router.tsx` | 页面路由、鉴权守卫 |
| 认证 | `src/features/auth/` | 登录态、Token 存取 |
| 页面 | `src/features/pages/` | 页面树、共享页、编辑上下文 |
| API | `src/lib/api/` | HTTP 客户端、各资源 API |
| 编辑器 | `src/components/editor/` | Plate 插件与工具栏 |
| 布局 | `src/components/layout/` | 侧栏、顶栏、Wiki 壳 |

**路由结构**：

| 路径 | 鉴权 | 说明 |
|------|------|------|
| `/login`, `/register` | 否 | 登录注册 |
| `/page/:pageId` | 是 | 工作区编辑 |
| `/public/:pageId` | 否 | 仅「对外公开」页的只读分享 |
| `/p/:pageId` | 否 | 重定向到 `/public/:pageId` |
| `/invite/:inviteCode` | 是 | 接受邀请 |
| `/` | 是 | 首页（我的知识） |
| `/shared` | 是 | 共享知识（树形） |
| `/communities` | 是 | 社区列表 |
| `/communities/:id` | 是 | 社区详情 |
| `/settings` | 是 | 用户设置 |

## 目录结构

```
frontend/
├── config/                 # YAML 配置（与后端风格一致）
│   ├── default.yaml
│   ├── development.yaml    # npm run dev
│   ├── production.yaml     # npm run build
│   └── load.ts             # 配置加载器
├── src/
│   ├── main.tsx            # 入口
│   ├── router.tsx          # 路由
│   ├── app/                # 全局 Provider
│   ├── pages/              # 页面组件
│   ├── features/           # 业务模块（auth、pages、communities）
│   ├── components/         # UI 与编辑器组件
│   ├── lib/api/            # API 客户端
│   └── hooks/
├── public/
├── nginx.conf              # 生产 Docker 用
├── vite.config.ts          # Vite + 读取 YAML 配置
├── Dockerfile
├── package.json
└── README.md
```

## 配置

配置在 `vite.config.ts` 启动时通过 `config/load.ts` 加载：`default.yaml` + `{mode}.yaml` 深度合并，环境变量可覆盖。

Vite `mode` 与配置文件对应关系：

| npm 命令 | mode | 配置文件 |
|----------|------|----------|
| `npm run dev` | `development` | `config/development.yaml` |
| `npm run dev:prod` | `production` | `config/production.yaml` |
| `npm run build` | `production` | `config/production.yaml` |

### 主要配置项

| 配置路径 | 说明 | 默认值 |
|----------|------|--------|
| `server.host` | dev server 监听所有网卡 | `true` |
| `server.port` | dev server 端口 | `5173` |
| `proxy.target` | 开发时 `/api` 代理目标 | `http://127.0.0.1:8001` |
| `api.baseUrl` | 浏览器 API base URL | `/api/v1` |

`api.baseUrl` 通过 Vite `define` 注入为 `import.meta.env.VITE_API_BASE_URL`，供 `src/lib/api/client.ts` 使用。

### 环境变量覆盖

| 变量 | 覆盖项 | 场景 |
|------|--------|------|
| `API_PROXY` | `proxy.target` | 本地后端端口变更 |
| `VITE_API_BASE_URL` | `api.baseUrl` | CI 构建、独立 API 域名 |

示例：

```bash
API_PROXY=http://127.0.0.1:8002 npm run dev
VITE_API_BASE_URL=https://api.example.com/api/v1 npm run build
```

### 开发 vs 生产网络

**开发**（`npm run dev`）：

```
浏览器 → localhost:5173/api/v1/*
              ↓ Vite proxy
         localhost:8001/api/v1/*
```

**生产**（Docker / nginx）：

```
浏览器 → your-domain/api/v1/*
              ↓ nginx proxy_pass
         backend:8001/api/v1/*
```

生产环境 `config/production.yaml` 默认 `api.baseUrl: /api/v1`（同源），无需 CORS。

## 运行方式

### 前置条件

- Node.js 22+
- 后端 API 可访问（本地默认 `http://127.0.0.1:8001`）

### 本地开发

```bash
cd frontend
npm install
npm run dev
```

访问 `http://localhost:5173`。

使用 production 配置本地调试（例如验证生产 API 地址）：

```bash
npm run dev:prod
```

### 类型检查

```bash
npm run typecheck
```

### 本地预览生产构建

```bash
npm run build
npm run preview
```

`preview` 仅提供静态文件服务，**不含** `/api` 反代；完整联调请用 Docker 或在 nginx 后部署。

## 部署

前后端**各自独立部署**时，前端是纯静态资源 + 反向代理；后端地址通过 `production.yaml` 或构建时环境变量配置。

### 方式一：Docker 单服务

在 `frontend/` 目录构建。镜像为多阶段：Node 构建 → nginx 托管 `dist/`。

```bash
cd frontend
docker build -t wiki-frontend .

docker run -d \
  --name wiki-frontend \
  -p 80:80 \
  wiki-frontend
```

**注意**：`nginx.conf` 中 `/api` 反代到 `http://backend:8001`，适用于 docker compose 网络。单独部署时需修改 `nginx.conf` 中的 upstream 地址，例如：

```nginx
proxy_pass http://your-backend-host:8001;
```

或在宿主机 nginx 层做反代，容器内 nginx 只服务静态文件。

### 方式二：docker compose（仓库根目录）

与后端一起部署（推荐）：

```bash
cd ..   # 项目根目录 wiki/
cp .env.example .env
docker compose up -d --build
```

- 前端映射 `${FRONTEND_PORT:-80}:80`
- nginx 自动将 `/api` 转发到 `backend:8001`
- 无需修改 `production.yaml`（同源 `/api/v1`）

### 方式三：静态托管 + 外部 API

适用于 Vercel、OSS、CDN 等纯静态托管，API 在独立域名：

1. 构建时指定 API 地址：

```bash
VITE_API_BASE_URL=https://api.example.com/api/v1 npm run build
```

2. 将 `dist/` 上传到静态托管
3. 配置 SPA fallback（所有路径回退到 `index.html`）
4. 后端需将前端域名加入 CORS `origins`

### 方式四：自建 nginx

```nginx
server {
    listen 80;
    root /var/www/wiki/dist;
    index index.html;

    client_max_body_size 50m;

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

构建产物：

```bash
npm run build
# 部署 dist/ 到 root 目录
```

## 与后端联调 checklist

1. 后端已启动，且 `curl http://127.0.0.1:8001/health` 返回正常
2. 开发环境 `config/default.yaml` 中 `proxy.target` 与后端端口一致
3. 生产环境前后端同源时，`api.baseUrl` 为 `/api/v1`，nginx 配置 `/api/` 反代
4. 生产环境前后端跨域时，构建设置 `VITE_API_BASE_URL`，后端 CORS 加入前端域名
