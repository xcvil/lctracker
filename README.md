# LCTracker

NeetCode 刷题追踪系统，基于艾宾浩斯遗忘曲线的间隔重复复习调度。

## 功能

- **题目管理** — 支持 NeetCode 75 / 150 / 250 / All（400+ 题），按 18 个 topic 分类
- **间隔重复** — 基于艾宾浩斯遗忘曲线（R = e^(-t/S)），复习间隔 1→2→4→7→15→30 天
- **掌握度反馈** — 每次复习后评估 1-5 分（完全忘了 → 非常熟练），影响下次复习时间
- **记忆保持率** — 实时计算每道题的记忆保持百分比，支持按保持率排序找薄弱环节
- **Markdown 笔记** — 每次刷题/复习可记录笔记，支持 Markdown 渲染和全文搜索
- **每日统计** — 柱状图展示每日刷题数（含重复复习的 distinct 题数）
- **进度重置** — 任意题目可重置进度重新开始
- **题库同步** — 更新 seed JSON 后一键 Sync 导入新题

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python 3.11+ / FastAPI / SQLite |
| 前端 | React 18 / TypeScript / Vite |
| 图表 | Recharts |
| 包管理 | uv (Python) / npm (Node) |

## 快速开始

### 前置条件

- Python 3.11+（通过 uv 管理）
- Node.js 18+

### 启动后端

```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

首次启动自动初始化 SQLite 数据库并导入题库。

### 启动前端

```bash
cd frontend
npm install   # 首次需要
npm run dev
```

打开 http://localhost:5173

## 项目结构

```
lctracker/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI 入口，CORS，lifespan
│   │   ├── database.py      # SQLite 连接，建表
│   │   ├── models.py        # Pydantic 模型
│   │   ├── srs.py           # 艾宾浩斯遗忘曲线算法
│   │   ├── seed.py          # JSON 导入
│   │   └── routers/
│   │       ├── problems.py  # 题目 CRUD、筛选、同步
│   │       ├── reviews.py   # 复习记录、历史、重置
│   │       ├── notes.py     # 笔记 CRUD、搜索
│   │       └── activity.py  # 每日统计
│   ├── seed_data/
│   │   └── neetcode_problems.json
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api/client.ts
│   │   ├── types.ts
│   │   ├── hooks/           # useProblems, useReviews, useActivity
│   │   └── components/      # Layout, ProblemTable, ReviewQueue, ReviewModal, etc.
│   └── vite.config.ts
├── CLAUDE.md
└── README.md
```

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/problems` | 题目列表（支持 topic/difficulty/list/status/sort 筛选） |
| GET | `/api/problems/topics` | 所有 topic 列表 |
| POST | `/api/problems/sync` | 重新导入 seed JSON |
| POST | `/api/reviews/{id}` | 记录复习（带 confidence 1-5） |
| DELETE | `/api/reviews/{id}` | 重置题目进度 |
| GET | `/api/reviews/due` | 所有到期题目 |
| GET | `/api/reviews/due/today` | 今日到期 |
| GET | `/api/reviews/due/overdue` | 逾期未复习 |
| GET | `/api/reviews/history/{id}` | 复习历史 |
| GET | `/api/notes/{problem_id}` | 题目笔记 |
| PUT | `/api/notes/{note_id}` | 更新笔记 |
| GET | `/api/notes/search/{query}` | 搜索笔记 |
| GET | `/api/activity` | 每日刷题统计 |

## 间隔重复算法

基于艾宾浩斯遗忘曲线 `R = e^(-t/S)`：

- **R** = 记忆保持率
- **t** = 距上次复习天数
- **S** = 记忆稳定性 = interval / ln(2)

复习时根据掌握度调整 stage：

| 掌握度 | 效果 |
|--------|------|
| 1 完全忘了 | 重置到 stage 0 |
| 2 很模糊 | 退一个 stage |
| 3 勉强记得 | 保持当前 stage |
| 4 比较清晰 | 进一个 stage |
| 5 非常熟练 | 进两个 stage |

Stage 对应复习间隔：0→1天, 1→2天, 2→4天, 3→7天, 4→15天, 5→30天。
