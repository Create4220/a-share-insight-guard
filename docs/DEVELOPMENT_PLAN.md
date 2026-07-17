# 开发实施计划

> 按阶段完成开发。每一阶段完成后，运行测试或构建并修复明显问题，再进入下一阶段。

---

## Phase 0：项目初始化

目标：

- 初始化 Git；
- 建立 `frontend` 和 `backend` 目录；
- 初始化 React + TypeScript + Vite 前端；
- 初始化 FastAPI 后端；
- 配置 CORS；
- 创建 `.env.example`；
- 创建基础 README；
- 前后端均可启动；
- 创建基础 GitHub Actions 工作流。

验收：

```bash
cd frontend && npm run build
cd backend && pytest
```

---

## Phase 1：后端基础设施与演示数据

目标：

- 实现 SQLAlchemy 数据库；
- 默认使用 SQLite；
- 创建核心表；
- 提供数据库初始化与 seed 脚本；
- 生成至少 12 条演示审校记录；
- 生成至少 8 条预置规则；
- 生成审核任务和审计日志；
- 实现 health API。

验收：

- 删除 SQLite 数据库后可通过一个命令重新初始化；
- API `/api/v1/health` 返回健康状态；
- API 可读取演示数据。

建议命令：

```bash
python -m app.scripts.seed_data
```

---

## Phase 2：规则引擎与审校 API

目标：

- 实现可配置风险规则；
- 实现文本按句拆分；
- 实现主张类型识别；
- 实现风险检测；
- 实现评分算法；
- 实现状态判定；
- 实现风险提示缺失识别；
- 实现合规改写建议模板；
- 实现 `POST /api/v1/analyses/review`；
- 编写核心单元测试。

验收：

- 高风险示例返回 `BLOCKED`；
- 中风险示例至少返回 `NEEDS_REVISION`；
- 低风险示例可返回 `APPROVED`；
- 禁用规则后不再命中该规则。

---

## Phase 3：审核工作流与审计日志

目标：

- 实现审核任务查询；
- 实现审核详情；
- 实现审核决策接口；
- 审核意见必填；
- 审核操作更新任务和内容状态；
- 审核操作生成审计日志；
- 实现规则编辑和启停；
- 规则改动生成审计日志。

验收：

- 可完成“审校 -> 提交审核 -> 拦截 -> 查看日志”的完整 API 闭环；
- 编写审核决策与审计日志测试。

---

## Phase 4：前端应用壳与 Dashboard

目标：

- 建立整体深色主题；
- 实现侧边导航；
- 实现顶栏；
- 实现 Dashboard；
- 接入 dashboard API；
- 展示指标卡、趋势图、风险分布、待处理任务；
- 完成 loading / empty / error 状态。

验收：

```bash
cd frontend && npm run build
```

---

## Phase 5：内容审校工作台

目标：

- 实现输入编辑区；
- 实现演示案例快捷填充；
- 调用审校 API；
- 展示审校评分、风险命中、原文高亮；
- 展示主张卡片与证据卡片；
- 展示改写建议；
- 实现提交人工复核；
- 显示明显免责声明。

验收：

- 用户可以从空白输入开始完成一次审校；
- 可以使用三种样例快速演示；
- 高风险样例的风险命中清晰可见。

---

## Phase 6：审核队列、详情和规则中心

目标：

- 审核任务列表、筛选、搜索和分页；
- 审核任务详情；
- 审核操作弹窗；
- 审计时间线；
- 规则列表；
- 规则编辑抽屉或弹窗；
- 启停规则；
- 规则改动后审校效果可验证。

验收：

- 前端可完成完整审核闭环；
- 状态更新后 Dashboard 和队列会刷新；
- 可查看规则变更记录。

---

## Phase 7：质量完善与文档

目标：

- 修复 UI 问题；
- 确保移动端基础可用；
- 增加空状态与错误状态；
- 检查所有合规文案；
- 完善 README、架构文档、API 文档和演示脚本；
- 增加截图位置说明；
- 执行全部测试和构建；
- 检查 `.gitignore`；
- 不提交 `.env`、数据库文件、node_modules、Python 缓存。

验收：

```bash
cd backend && pytest
cd frontend && npm run build
```

---

## Git 提交建议

每完成一个阶段，创建语义清晰的提交：

```text
chore: initialize full-stack project structure
feat: add demo data and SQLite persistence
feat: implement configurable compliance rule engine
feat: add review workflow and audit trail
feat: build compliance dashboard
feat: add content review workspace
feat: add review queue and rule center
docs: complete project documentation
test: improve rule engine and workflow coverage
```
```

