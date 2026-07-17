# A-Share Insight Guard / A股投研合规助手

基于证据链、风险分级与适当性管理的 AI 投资信息分析系统

面向 A 股个人投资者的 AI 投研辅助系统。系统不提供买卖建议或收益承诺，而是将市场信息、公告与研报转化为可追溯的分析摘要，并通过风险识别、投资者适当性匹配、敏感表达拦截和人工复核队列，降低非理性决策与不合规输出风险

---

## 免责声明

> 本项目仅用于金融信息内容治理与技术研究演示，不构成任何证券投资建议、投资邀约或收益承诺。证券市场存在风险，投资需谨慎。

---

## 功能概览

### 合规概览 (Dashboard)
- 四张指标卡片：今日审校数、高风险内容数、待人工复核数、已通过数
- 最近 7 天风险趋势折线图（总数 / 高风险 / 严重风险三条线）
- 风险类别分布柱状图
- 待处理高风险任务列表，每行前方眼睛图标可弹出详情弹窗，直接调整风险等级和审核状态

### 内容审校工作台 (Review Workspace)
- 三段演示案例一键填入（低风险 / 中风险 / 高风险检测样例）
- 粘贴或输入文本后点击"开始审校"，实时调用规则引擎
- 结果展示：0-100 合规评分仪表盘、风险命中列表（命中模式 + 匹配原文）、主张分类标签、证据来源卡片、合规改写建议
- 高风险内容审校后自动创建审核任务并同步到审核队列
- 中低风险内容可手动提交人工复核

### 审核任务队列 (Review Queue)
- 按状态、风险等级筛选，支持按任务编号/标题/证券标识搜索
- 统计摘要行 + 分页表格
- 每行眼睛图标弹出详情弹窗，可查看原始文本、风险命中详情、主张分析、证据来源
- 弹窗内可调整风险等级（低/中/高/严重）和审核状态（已通过/需修改/待人工复核/已拦截）
- 调整后自动写入审计日志

### 审核详情 (Review Detail)
- 任务信息卡片（评分仪表盘、状态标签、风险标签）
- 四个标签页切换：原始内容、风险命中、主张分析、证据来源
- 审核操作区：通过 / 退回修改 / 拦截 / 要求补充证据，审核意见必填
- 审计时间线按时间顺序展示所有操作记录

### 规则中心 (Rule Center)
- 按风险等级筛选，支持搜索
- 每条规则展示标识、名称、说明、匹配关键词、动作标签、启用状态
- 新建/编辑弹窗表单，含规则 ID、名称、说明、风险等级、处理动作、匹配模式
- 规则 ID 格式校验（大写字母开头，仅含大写字母数字下划线）
- 开关按钮即时启用/停用规则
- 规则变更自动记录审计日志

### 审计记录 (Audit Logs)
- 按实体类型筛选，支持按操作人/操作类型/实体 ID/备注搜索
- 表格展示时间、操作人、操作类型、实体类型、实体 ID、变更前后状态、备注
- 每行眼睛图标弹出详情，可编辑备注
- 撤回按钮：撤回操作自动恢复原始风险等级和状态，留下撤回记录
- 时间列分两行显示（日期 / 时刻），实体 ID 支持换行

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | React 19 · TypeScript · Vite |
| UI 组件 | shadcn/ui (Base UI) · Tailwind CSS 4 |
| 图表 | Recharts |
| 状态管理 | TanStack Query |
| 路由 | React Router v7 |
| 后端框架 | Python 3.11+ · FastAPI |
| 数据库 | SQLAlchemy 2.x · SQLite |
| 数据校验 | Pydantic v2 |
| 测试 | pytest (44 个用例) |

---

## 本地运行

### 前提

- Node.js 20+
- Python 3.11+

### 一键启动

```bash
# 双击项目根目录 run.bat
# 或在命令行执行：
run.bat
```

脚本自动执行：创建虚拟环境 → 安装 Python 依赖 → 初始化演示数据 → 启动后端 (8000 端口) → 等待后端就绪 → 安装前端依赖 → 启动前端 (5173 端口) → 打开浏览器。

### 手动分别启动

**后端** (终端 1)：
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m app.scripts.seed_data
uvicorn app.main:app --reload
```

**前端** (终端 2)：
```bash
cd frontend
npm install
npm run dev
```

启动后访问：
- 前端页面：http://localhost:5173
- Swagger API 文档：http://localhost:8000/docs
- ReDoc API 文档：http://localhost:8000/redoc

### 辅助脚本

| 脚本 | 作用 |
|------|------|
| `run.bat` | 一键启动后端 + 前端 |
| `open-frontend.bat` | 浏览器打开前端（服务器须已运行） |
| `open-docs.bat` | 浏览器打开 Swagger 文档 |
| `open-redoc.bat` | 浏览器打开 ReDoc 文档 |

---

## 设计

莫兰迪色系亮色主题。暖白背景 (#F7F5F2)，灰蓝主色，灰绿表示通过/安全，蜂蜜琥珀表示警告，灰珊瑚表示高风险，鲜红表示严重/拦截。80px 窄侧边栏，大图标 + 小文字垂直导航。

详细规范见 `docs/DESIGN_SYSTEM.md`。

---

## 项目结构

```text
a-share-insight-guard/
├── frontend/src/
│   ├── components/
│   │   ├── layout/          # AppLayout, Sidebar (80px icon nav), TopBar
│   │   ├── shared/          # MetricCard, ScoreGauge, StatusBadge, RiskBadge
│   │   └── ui/              # shadcn/ui components
│   ├── lib/                 # API client, cn() utility
│   ├── pages/               # 6 pages: Dashboard, ReviewWorkspace, ReviewQueue,
│   │                          ReviewDetail, RuleCenter, AuditLogs
│   └── types/               # TypeScript type definitions
├── backend/app/
│   ├── models/              # 8 ORM entities: Analysis, Claim, Evidence, RiskHit,
│   │                          ReviewTask, ReviewDecision, Rule, AuditLog
│   ├── routers/             # 17 API endpoints under /api/v1
│   ├── services/            # Rule engine: text splitting, claim classification,
│   │                          pattern matching, scoring, status decision
│   ├── schemas/             # Pydantic request/response models
│   └── scripts/seed_data.py # Demo data initializer (idempotent)
├── docs/                    # Product spec, design system, architecture, API docs,
│                              demo script, acceptance checklist
├── run.bat                  # One-click launcher
└── README.md
```

---

## 演示数据

初始化后包含 12 条审校记录、8 条合规规则、4 个审核任务和若干审计日志。种子脚本只在数据库为空时写入，重启不会覆盖已有数据。

虚构演示标的：

| 代码 | 名称 | 行业 |
|------|------|------|
| DEMO001 | 星河智算 | 数字基础设施 |
| DEMO002 | 远景新材 | 先进材料 |
| DEMO003 | 澄明医科 | 医疗技术 |
| DEMO004 | 海岚能源 | 清洁能源 |

---

## API 概览

```
GET    /api/v1/dashboard/summary
GET    /api/v1/dashboard/risk-trend
GET    /api/v1/dashboard/risk-distribution
GET    /api/v1/dashboard/pending-tasks

POST   /api/v1/analyses/review
GET    /api/v1/analyses
GET    /api/v1/analyses/{id}
PATCH  /api/v1/analyses/{id}/risk-level
POST   /api/v1/analyses/{id}/submit-review

GET    /api/v1/review-tasks
GET    /api/v1/review-tasks/{id}
POST   /api/v1/review-tasks/{id}/decision

GET    /api/v1/rules
POST   /api/v1/rules
PATCH  /api/v1/rules/{id}
POST   /api/v1/rules/{id}/toggle

GET    /api/v1/audit-logs
PATCH  /api/v1/audit-logs/{id}
POST   /api/v1/audit-logs/{id}/revoke

GET    /api/v1/health
```

完整文档见 `docs/api.md` 或启动后端后访问 `/docs`。

---

## 合规评分规则

初始 100 分，按命中项扣分：

| 命中等级 | 扣分 |
|----------|------|
| CRITICAL | -45 |
| HIGH | -25 |
| MEDIUM | -12 |
| LOW | -5 |
| 缺少风险揭示 | -10 |
| 缺少证据来源 | -15 |
| 含高权威来源 | +5 |

状态判定：有 CRITICAL 或 BLOCK 动作 → 拦截；有 HIGH → 待人工复核；分数 < 70 → 需修改；其余 → 通过。

---

## 测试

```bash
cd backend && python -m pytest -v   # 44 tests
cd frontend && npm run build         # TypeScript + Vite build
```

---

## 许可证

MIT License
