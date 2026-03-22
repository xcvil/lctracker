# LCTracker 项目指令

## 项目概述

NeetCode 刷题追踪系统（954 题）。后端 Python FastAPI + SQLite，前端 React + TypeScript + Vite。

## 开发命令

```bash
# 启动后端（从 backend/ 目录）
cd backend && uv run uvicorn app.main:app --reload --port 8000

# 启动前端（从 frontend/ 目录）
cd frontend && npm run dev

# 前端类型检查 + 构建验证
cd frontend && npx tsc --noEmit && npm run build

# 从 NeetCode 官网同步题库（抓取 main.js bundle）
cd backend && uv run python scripts/fetch_neetcode.py

# 清空数据库重新开始
rm backend/lctracker.db
```

## 架构

- **后端**: `backend/app/` — FastAPI，SQLite（`lctracker.db`），无 ORM（原生 `sqlite3` + 参数化查询）
- **前端**: `frontend/src/` — React 18 + TypeScript，Vite dev server 代理 `/api` 到 `localhost:8000`
- **数据库**: 4 张表 `problems`、`problem_progress`、`review_log`、`notes`
- **SRS 算法**: `backend/app/srs.py` — 艾宾浩斯遗忘曲线 R=e^(-t/S)，间隔 [1, 2, 4, 7, 15, 30] 天
- **题库数据**: `backend/seed_data/neetcode_problems.json` — 启动时 upsert 同步
- **题库抓取**: `backend/scripts/fetch_neetcode.py` — 从 neetcode.io 的 main.js 提取 954 题 + 75/150/250 标志

## 编码规范

- 后端路由使用同步 `def`（FastAPI 自动在线程池运行），不用 `async def`
- 数据库查询使用参数化 `?` 占位符，防止 SQL 注入
- 前端组件文件名 PascalCase（`ReviewModal.tsx`），hooks 文件名 camelCase（`useReviews.ts`）
- API 客户端统一通过 `frontend/src/api/client.ts`（get/post/put/del），所有请求走 `/api` 前缀
- CSS 使用 CSS 变量，暗色主题，定义在 `frontend/src/index.css` 的 `:root`
- Pydantic 模型定义在 `backend/app/models.py`
- 添加新路由后需要在 `backend/app/main.py` 注册 router

## 数据同步流程

1. `scripts/fetch_neetcode.py` 从官网抓取 → 覆盖 `seed_data/neetcode_problems.json`
2. `seed.py` 用 `ON CONFLICT(slug) DO UPDATE` 同步到 DB（只更新题目元数据，不动用户数据）
3. 官网没有但 DB 有的题 → 级联删除（problem + progress + review_log + notes）
4. 用户的 progress/review_log/notes 通过 problem_id 外键关联，slug 用于导入导出

## 重要注意事项

- 数据库文件 `backend/lctracker.db` 在 `.gitignore` 中，不要提交
- 前端无状态管理库，用 React hooks + fetch 直接调用 API
- Filter 状态存 localStorage（key: `lctracker-filters`），切换页面不丢失
- 导入导出用 slug 关联题目（不依赖 id），换数据库/重建后也能恢复
- 掌握度 1-5 影响 stage：1→重置0, 2→回到1, 3→退一级, 4→不变, 5→进一级
- Stats 中 Solved = 首次做的 distinct 题数，Reviews = 只算复习次数（不含首次）
- 环形图三段弧度按 Easy/Med/Hard 题目数量比例分配，底部 120° 开口
