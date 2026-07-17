# API 文档

基础 URL: `http://localhost:8000/api/v1`

所有接口使用统一响应格式：

```json
// 成功
{ "success": true, "data": {...}, "message": "optional" }

// 失败
{ "success": false, "error": { "code": "STRING", "message": "描述" } }
```

---

## Dashboard

### `GET /dashboard/summary`

获取仪表盘摘要数据。

**响应**:
```json
{
  "data": {
    "total_analyses_today": 12,
    "high_risk_count": 3,
    "pending_review_count": 2,
    "approved_count": 4,
    "avg_compliance_score": 68.5
  }
}
```

### `GET /dashboard/risk-trend`

最近 7 天风险趋势。

**响应**:
```json
{
  "data": [
    { "date": "07-10", "total": 2, "high_risk": 1, "critical": 0 },
    ...
  ]
}
```

### `GET /dashboard/risk-distribution`

风险类别分布。

**响应**:
```json
{
  "data": [
    { "category": "直接荐股表达", "count": 5 },
    ...
  ]
}
```

### `GET /dashboard/pending-tasks`

待处理的高风险任务（最多 5 条）。

---

## Analyses

### `POST /analyses/review`

提交内容审校。

**请求**:
```json
{
  "content": "待审校的金融分析文本（必填，1-10000字符）",
  "security_code": "DEMO001",
  "title": "可选标题"
}
```

**响应**:
```json
{
  "data": {
    "id": "uuid",
    "compliance_score": 72,
    "status": "NEEDS_REVISION",
    "risk_level": "MEDIUM",
    "risk_hits": [...],
    "claims": [...],
    "evidence": [...],
    "revision_suggestions": [...],
    "missing_risk_disclosure": true,
    "missing_evidence": false
  }
}
```

### `GET /analyses`

获取所有审校记录列表。

### `GET /analyses/{analysis_id}`

获取单条审校记录详情（含关联的主张、证据、风险命中）。

### `POST /analyses/{analysis_id}/submit-review`

将审校结果提交人工复核，创建一个审核任务。

---

## Review Tasks

### `GET /review-tasks`

查询审核任务列表。

**查询参数**:
- `status`: APPROVED / NEEDS_REVISION / NEEDS_MANUAL_REVIEW / BLOCKED
- `risk_level`: LOW / MEDIUM / HIGH / CRITICAL
- `page`: 页码（默认 1）
- `page_size`: 每页条数（默认 20）

### `GET /review-tasks/{task_id}`

获取审核任务详情（含关联的分析和审核决定）。

### `POST /review-tasks/{task_id}/decision`

作出审核决定。

**请求**:
```json
{
  "action": "APPROVE",         // APPROVE | REJECT | BLOCK | REQUEST_EVIDENCE
  "comment": "审核意见（必填，1-2000字符）"
}
```

**动作说明**:
| 动作 | 效果 |
|------|------|
| APPROVE | 通过，状态变为 APPROVED |
| REJECT | 退回修改，状态变为 NEEDS_REVISION |
| BLOCK | 拦截，状态变为 BLOCKED |
| REQUEST_EVIDENCE | 要求补充证据，状态变为 NEEDS_REVISION |

---

## Rules

### `GET /rules`

获取规则列表。

**查询参数**:
- `risk_level`: LOW / MEDIUM / HIGH / CRITICAL
- `enabled`: true / false

### `POST /rules`

创建新规则。

**请求**:
```json
{
  "rule_id": "RULE_CUSTOM_001",
  "name": "自定义规则",
  "description": "规则说明",
  "risk_level": "MEDIUM",
  "action": "REQUIRE_REVISION",
  "patterns": ["关键词1", "关键词2"],
  "enabled": true
}
```

**校验规则**:
- `rule_id`: 必填，1-100 字符
- `name`: 必填，1-200 字符
- `risk_level`: LOW | MEDIUM | HIGH | CRITICAL
- `action`: PASS | REQUIRE_EVIDENCE | REQUIRE_REVISION | MANUAL_REVIEW | BLOCK

### `PATCH /rules/{rule_id}`

更新规则（部分更新）。

### `POST /rules/{rule_id}/toggle`

切换规则启用/停用状态。

---

## Audit Logs

### `GET /audit-logs`

查询审计日志。

**查询参数**:
- `entity_type`: analysis / review_task / rule
- `page`: 页码
- `page_size`: 每页条数

---

## Health

### `GET /health`

健康检查。

**响应**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "app_name": "A-Share Insight Guard",
    "version": "1.0.0"
  }
}
```
