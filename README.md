# LCTracker

NeetCode 刷题追踪系统，基于艾宾浩斯遗忘曲线的间隔重复复习调度。

## 功能

- **题目管理** — NeetCode 75 / 150 / 250 / All（954 题），19 个 topic 分类，自动从官网同步
- **间隔重复** — 基于艾宾浩斯遗忘曲线（R = e^(-t/S)），复习间隔 1→2→4→7→15→30 天
- **掌握度反馈** — 每次复习弹出 modal 评估 1-5 分，影响下次复习间隔
- **记忆保持率** — 实时计算每道题的记忆保持百分比，支持按保持率排序找薄弱环节
- **Markdown 笔记** — 每次刷题/复习可记录笔记，支持 Markdown 渲染和全文搜索
- **Stats 环形图** — Easy/Med/Hard 分段弧形进度图 + Solved/Reviews 统计 + today 标签
- **Activity Calendar** — GitHub 风格热力图，点击日期查看当天刷题详情
- **进度重置** — 任意题目可重置进度重新开始
- **数据导入导出** — 一键 Export/Import JSON 备份，换电脑可恢复
- **题库同步** — 脚本从 NeetCode 官网 main.js 提取最新题库，UI 点 Sync 加载
- **Filter 持久化** — 筛选条件存 localStorage，切换页面不丢失

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python 3.11+ / FastAPI / SQLite |
| 前端 | React 18 / TypeScript / Vite |
| 图表 | Recharts (bar chart) / SVG (环形图、热力图) |
| Markdown | react-markdown |
| 包管理 | uv (Python) / npm (Node) |

## 快速开始

### 前置条件

- Python 3.11+（通过 uv 管理）
- Node.js 18+

### 同步题库（首次或更新）

```bash
cd backend
uv run python scripts/fetch_neetcode.py
```

从 NeetCode 官网的 main.js bundle 提取 954 道题，包含 75/150/250 标志和难度。

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
│   │   ├── seed.py          # JSON → DB 同步（upsert + 清理）
│   │   └── routers/
│   │       ├── problems.py  # 题目 CRUD、筛选、同步
│   │       ├── reviews.py   # 复习记录、历史、重置
│   │       ├── notes.py     # 笔记 CRUD、搜索
│   │       ├── activity.py  # 统计、热力图日期详情
│   │       └── export.py    # 数据导入导出
│   ├── scripts/
│   │   └── fetch_neetcode.py  # 从官网抓取题库
│   ├── seed_data/
│   │   └── neetcode_problems.json
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api/client.ts       # API 封装 (get/post/put/del)
│   │   ├── types.ts
│   │   ├── hooks/              # useProblems, useReviews, useActivity
│   │   └── components/
│   │       ├── Layout.tsx          # 导航栏 + Sync/Export/Import
│   │       ├── ProblemTable.tsx    # 题目列表 + 筛选（localStorage 持久化）
│   │       ├── ProblemRow.tsx      # 题目行 + Review modal + Notes
│   │       ├── ReviewQueue.tsx     # 今日复习 + 逾期
│   │       ├── ReviewModal.tsx     # 复习弹窗 + 掌握度 + 历史
│   │       ├── ConfidenceButtons.tsx  # 1-5 掌握度按钮
│   │       ├── StatsRing.tsx       # 环形进度图 + today 标签
│   │       ├── CalendarHeatmap.tsx  # 热力图 + 日期详情
│   │       ├── ActivityChart.tsx   # Activity 页面容器
│   │       ├── NotesPanel.tsx      # 题目笔记编辑
│   │       ├── NotesSearch.tsx     # 笔记搜索
│   │       └── FilterBar.tsx       # 筛选下拉框
│   └── vite.config.ts
├── CLAUDE.md
└── README.md
```

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/problems` | 题目列表（支持 topic/difficulty/list/status/sort 筛选） |
| GET | `/api/problems/topics` | 所有 topic 列表 |
| POST | `/api/problems/sync` | 从 seed JSON 同步到数据库（upsert + 清理） |
| POST | `/api/reviews/{id}` | 记录复习（带 confidence 1-5） |
| DELETE | `/api/reviews/{id}` | 重置题目进度（含 progress/log/notes） |
| GET | `/api/reviews/due` | 所有到期题目 |
| GET | `/api/reviews/due/today` | 今日到期 |
| GET | `/api/reviews/due/overdue` | 逾期未复习 |
| GET | `/api/reviews/history/{id}` | 复习历史 |
| GET | `/api/notes/{problem_id}` | 题目笔记 |
| PUT | `/api/notes/{note_id}` | 更新笔记 |
| GET | `/api/notes/search/{query}` | 搜索笔记 |
| GET | `/api/activity` | 每日刷题统计（全量） |
| GET | `/api/activity/stats` | 总览统计（solved/reviews/today/by_difficulty） |
| GET | `/api/activity/day/{date}` | 某天的刷题详情 |
| GET | `/api/export` | 导出所有用户数据（JSON 下载） |
| POST | `/api/export/import` | 导入备份数据 |

## 间隔重复算法

基于艾宾浩斯遗忘曲线 `R = e^(-t/S)`：

- **R** = 记忆保持率
- **t** = 距上次复习天数
- **S** = 记忆稳定性 = interval / ln(2)

复习时根据掌握度调整 stage：

| 掌握度 | 效果 |
|--------|------|
| 1 完全忘了 | 重置到 stage 0 |
| 2 很模糊 | 重置到 stage 1（已在 0 则留 0） |
| 3 勉强记得 | 退一个 stage |
| 4 比较清晰 | 保持当前 stage |
| 5 非常熟练 | 进一个 stage |

Stage 对应复习间隔：0→1天, 1→2天, 2→4天, 3→7天, 4→15天, 5→30天。

## 题库同步

数据源：NeetCode 官网 main.js bundle（包含全部 954 题 + 75/150/250 标志）。

```bash
cd backend && uv run python scripts/fetch_neetcode.py
```

脚本会下载最新 bundle，提取题目数据，覆盖 `seed_data/neetcode_problems.json`。然后在 UI 点 Sync 或重启后端加载到数据库。同步只更新题目元数据，不影响刷题进度和笔记。
