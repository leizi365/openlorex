<p align="center">
  <img src="logo.svg" alt="Knowledge" width="96" height="96" />
</p>

<h1 align="center">Knowledge</h1>

<p align="center">
  所思所录，皆成己知 —— 一款面向个人与团队的块编辑器知识库。
</p>

## 简介

Knowledge 是一个 Notion 风格的 Wiki 应用：用块编辑器书写与组织知识，用目录树管理结构，用社区与授权实现协作共享。支持公开链接、最近访问、封面图标等能力，可在本地开发，也可通过 Docker 部署。

## 主要能力

- **块编辑器**：基于 Plate.js，支持标题、列表、表格、代码、公式、白板等
- **知识组织**：目录树、内页、层级限制、乐观锁保存
- **协作共享**：社区、邀请、知识授权（用户 / 社区）、共享知识列表
- **公开访问**：对外公开的知识可通过 `/public/:id` 只读浏览
- **移动端**：侧栏抽屉、响应式布局，手机端可正常使用

## 项目结构

```
wiki/
├── frontend/          # React + Vite + TypeScript 前端
├── backend/           # FastAPI + MySQL 后端
├── docker-compose.yml # 生产部署（frontend + backend）
└── logo.svg           # 项目 Logo（猫头鹰）
```

## 快速开始

### 本地开发

需要 Node.js、Python 3.10+、MySQL 8。

1. 初始化数据库：执行 `backend/sql/schema.sql`
2. 启动后端：见 [backend/README.md](backend/README.md)
3. 启动前端：见 [frontend/README.md](frontend/README.md)

默认地址：

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:5173 |
| 后端 API | http://localhost:8001/api/v1 |

### Docker 部署

```bash
export JWT_SECRET_KEY=your-secret
export DB_HOST=your-mysql-host
export DB_PASSWORD=your-password
docker compose up -d --build
```

可选 `--profile with-db` 一并启动内置 MySQL。详见根目录 `docker-compose.yml`。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19、Vite、TypeScript、Tailwind CSS、Plate.js |
| 后端 | FastAPI、SQLAlchemy、MySQL、JWT |
| 部署 | Docker、Nginx |

## 文档

- [前端说明](frontend/README.md)
- [后端说明](backend/README.md)
