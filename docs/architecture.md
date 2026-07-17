# 系统架构

## 总体架构

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         前端 (React + Vite)                              │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │Dashboard │ │ReviewWorkspace│ │ReviewQueue│ │RuleCenter│ │AuditLogs │ │
│  └────┬─────┘ └──────┬───────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│       │              │              │            │            │         │
│       └──────────────┴──────────────┴────────────┴────────────┘         │
│                                 │                                        │
│                          TanStack Query                                  │
└────────────────────────────────┼────────────────────────────────────────┘
                                 │ HTTP REST
                                 │ /api/v1/*
┌────────────────────────────────┼────────────────────────────────────────┐
│                         后端 (FastAPI)                                   │
│  ┌─────────────────────────────┼──────────────────────────────────────┐ │
│  │                       Middleware                                   │ │
│  │  CORS · Error Handling · Request Validation (Pydantic v2)          │ │
│  └─────────────────────────────┼──────────────────────────────────────┘ │
│                                 │                                        │
│  ┌──────────────────────────────┴─────────────────────────────────────┐ │
│  │                         API Routers                                 │ │
│  │  Dashboard · Analyses · ReviewTasks · Rules · AuditLogs            │ │
│  └──────────────────────────────┬─────────────────────────────────────┘ │
│                                 │                                        │
│  ┌──────────────────────────────┴─────────────────────────────────────┐ │
│  │                       Rule Engine                                   │ │
│  │  Text Splitter · Claim Classifier · Pattern Matcher · Scorer       │ │
│  └──────────────────────────────┬─────────────────────────────────────┘ │
│                                 │                                        │
│  ┌──────────────────────────────┴─────────────────────────────────────┐ │
│  │                     ORM (SQLAlchemy 2.x)                            │ │
│  │  Analysis · Claim · Evidence · RiskHit · ReviewTask · Rule ·       │ │
│  │  ReviewDecision · AuditLog                                          │ │
│  └──────────────────────────────┬─────────────────────────────────────┘ │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │       SQLite Database       │
                    │  insight_guard.db           │
                    └────────────────────────────┘
```

## 前端架构

### 目录结构

```text
frontend/src/
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx    # 主布局：侧边栏 + 顶栏 + 内容区 + 页脚
│   │   ├── Sidebar.tsx      # 左侧导航栏
│   │   └── TopBar.tsx       # 顶部工作区标题与用户信息
│   └── shared/
│       ├── ClaimTypeBadge.tsx
│       ├── EmptyState.tsx
│       ├── LoadingState.tsx
│       ├── MetricCard.tsx
│       ├── RiskBadge.tsx
│       ├── ScoreGauge.tsx
│       └── StatusBadge.tsx
├── lib/
│   └── api.ts              # API 调用封装
├── pages/
│   ├── AuditLogs.tsx
│   ├── Dashboard.tsx
│   ├── ReviewDetail.tsx
│   ├── ReviewQueue.tsx
│   ├── ReviewWorkspace.tsx
│   └── RuleCenter.tsx
└── types/
    └── index.ts            # TypeScript 类型定义
```

### 技术选型理由

| 技术 | 理由 |
|------|------|
| React 18 + TypeScript | 类型安全，生态成熟 |
| Vite | 极速 HMR 开发体验 |
| Tailwind CSS | 原子化 CSS，深色主题易实现 |
| React Router v6 | 声明式路由，嵌套布局支持 |
| Recharts | React 原生图表，轻量 |
| TanStack Query | 服务端状态管理，缓存/重试/刷新 |
| Lucide React | 轻量图标库 |

## 后端架构

### 目录结构

```text
backend/app/
├── config.py              # 应用配置（环境变量）
├── database.py            # 数据库引擎与会话管理
├── main.py                # FastAPI 入口，中间件，路由注册
├── models/                # SQLAlchemy ORM 模型
│   ├── base.py            # Base, TimestampMixin
│   ├── analysis.py        # Analysis, Claim, Evidence, RiskHit
│   ├── review.py          # ReviewTask, ReviewDecision
│   ├── rule.py            # Rule
│   └── audit.py           # AuditLog
├── routers/               # API 路由
│   ├── analyses.py        # POST /review, GET, GET/:id, POST/:id/submit-review
│   ├── audit_logs.py      # GET 审计日志列表
│   ├── dashboard.py       # GET summary, risk-trend, risk-distribution, pending-tasks
│   ├── review_tasks.py    # GET, GET/:id, POST/:id/decision
│   └── rules.py           # GET, POST, PATCH/:id, POST/:id/toggle
├── schemas/               # Pydantic 请求/响应模型
│   ├── analysis.py
│   ├── review.py
│   └── rule.py
├── services/
│   └── rule_engine.py     # 规则引擎：分句、分类、匹配、评分
└── scripts/
    └── seed_data.py       # 演示数据初始化脚本
```

### 评分算法

```text
初始分：100

扣分项：
  CRITICAL 命中：每项 -45
  HIGH 命中：每项 -25
  MEDIUM 命中：每项 -12
  LOW 命中：每项 -5
  缺少风险揭示：-10
  缺少证据/来源：-15

加分项：
  存在至少一个高权威来源（等级 A/B）：+5

最终得分：[0, 100]
```

### 状态判定逻辑

```text
if 存在 BLOCK 动作或 CRITICAL 风险 → BLOCKED
elif 存在 HIGH 风险 → NEEDS_MANUAL_REVIEW
elif score < 70 → NEEDS_REVISION
else → APPROVED
```

### 数据库实体关系

```text
Analysis (1) ──< (n) Claim
Analysis (1) ──< (n) Evidence
Analysis (1) ──< (n) RiskHit
Analysis (1) ──< (1) ReviewTask
ReviewTask (1) ──< (n) ReviewDecision
ReviewTask (n) >── (1) Analysis

AuditLog: 独立实体，记录所有操作
Rule: 独立实体，支持启用/停用
```
