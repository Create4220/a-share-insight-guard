# 设计系统规范

## 1. 设计目标

A-Share Insight Guard 是一个内容治理和风险审校平台。

视觉感受应为：

- 理性；
- 清晰；
- 审慎；
- 专业；
- 可信；
- 有企业级软件质感。

不要使用典型股票行情产品的红涨绿跌逻辑作为主要视觉语言。
本项目重点是“风险与合规状态”，而不是“价格涨跌”。

---

## 2. 默认主题

默认深色模式。

### 基础色

```text
Canvas:          #0B1220
Surface:         #111C2E
Surface Raised:  #17243A
Border:          #263852
Text Primary:    #E6EDF7
Text Secondary:  #93A4BD
Text Muted:      #667892
Primary:         #5B8CFF
Evidence:        #8B7CFF
Success:         #22C58B
Warning:         #F0AE3B
Danger:          #F05B5B
Critical:        #E64040
```

### 风险色语义

```text
LOW:       蓝色或灰蓝色
MEDIUM:    琥珀色
HIGH:      橙色
CRITICAL:  红色
```

---

## 3. 版式

### 桌面端

- 左侧栏宽度：240px 左右；
- 主内容区最大宽度：1600px；
- 内容区留白：24px 至 32px；
- 卡片圆角：12px；
- 卡片边框弱化，不使用厚重阴影；
- 表格行高保持舒适；
- 主要内容密度中等，不要过度拥挤。

### 移动端

- 左侧导航改为抽屉；
- Dashboard 卡片从四列变为一列或两列；
- 表格允许横向滚动，或转换为卡片列表；
- 审校工作台左右布局改为上下布局。

---

## 4. 页面导航

左侧导航推荐：

```text
品牌区
- A-Share Insight Guard
- 内容合规治理工作台

主导航
- 概览
- 内容审校
- 审核队列
- 规则中心
- 审计记录

底部
- 演示环境
- 数据仅用于技术演示
```

---

## 5. 关键组件

必须实现以下可复用组件：

- `StatusBadge`
- `RiskBadge`
- `ScoreGauge`
- `MetricCard`
- `EmptyState`
- `LoadingState`
- `EvidenceSourceCard`
- `ClaimTypeBadge`
- `AuditTimeline`
- `ReviewDecisionDialog`
- `RiskHighlightText`

### ScoreGauge

分数颜色规则：

```text
85-100：绿色
70-84：蓝绿色
50-69：琥珀色
0-49：红色
```

必须显示文字说明，例如：

```text
72 / 100
需补充完善
```

---

## 6. 文案风格

使用明确、审慎、客观的中文表达。

推荐：

- “检测到操作导向措辞，建议人工确认。”
- “该主张尚未关联充分的公开证据。”
- “建议补充风险揭示和来源说明。”
- “该内容仅适用于演示数据环境。”

避免：

- “这只股票很有机会”
- “抓住机会”
- “稳赚”
- “看涨”
- “强势”
- “抄底”
- “布局”
```

