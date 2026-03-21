# LCTracker 项目指令

## 项目概述

NeetCode 刷题追踪系统。后端 Python FastAPI + SQLite，前端 React + TypeScript + Vite。

## 开发命令

```bash
# 启动后端（从 backend/ 目录）
cd backend && uv run uvicorn app.main:app --reload --port 8000

# 启动前端（从 frontend/ 目录）
cd frontend && npm run dev

# 前端类型检查
cd frontend && npx tsc --noEmit

# 清空数据库重新开始
rm backend/lctracker.db

# 从 NeetCode GitHub 同步题库（数据源: .problemSiteData.json）
cd backend && uv run python scripts/fetch_neetcode.py
```

## 架构

- **后端**: `backend/app/` — FastAPI，SQLite（`lctracker.db`），无 ORM（原生 `sqlite3` + 参数化查询）
- **前端**: `frontend/src/` — React 18 + TypeScript，Vite dev server 代理 `/api` 到 `localhost:8000`
- **数据库**: 三张表 `problems`（题目）、`problem_progress`（进度）、`review_log`（复习日志）+ `notes`（笔记）
- **SRS 算法**: `backend/app/srs.py` — 艾宾浩斯遗忘曲线，间隔 [1, 2, 4, 7, 15, 30] 天
- **题库数据**: `backend/seed_data/neetcode_problems.json` — 启动时自动 seed

## 编码规范

- 后端路由使用同步 `def`（FastAPI 自动在线程池运行），不用 `async def`
- 数据库查询使用参数化 `?` 占位符，防止 SQL 注入
- 前端组件文件名 PascalCase（`ReviewModal.tsx`），hooks 文件名 camelCase（`useReviews.ts`）
- API 客户端统一通过 `frontend/src/api/client.ts`，所有请求走 `/api` 前缀（Vite 代理）
- CSS 使用 CSS 变量，暗色主题，定义在 `frontend/src/index.css` 的 `:root`
- Pydantic 模型定义在 `backend/app/models.py`
- 添加新路由后需要在 `backend/app/main.py` 注册 router

## 重要注意事项

- 数据库文件 `backend/lctracker.db` 在 `.gitignore` 中，不要提交
- 题库 JSON 用 `INSERT OR IGNORE`（按 slug 去重），支持幂等 seed
- 前端无状态管理库，用 React hooks + fetch 直接调用 API
- 用户界面语言混合中英文：Review 页面用中文，Problems 页面用英文
