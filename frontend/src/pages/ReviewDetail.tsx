import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  FileText,
  AlertTriangle,
  Lightbulb,
  Link2,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  Ban,
  FileQuestion,
  UserIcon,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { fetchReviewTask, fetchAnalysis, submitDecision, fetchAuditLogs } from '@/lib/api'
import type { ReviewAction } from '@/types'
import StatusBadge from '@/components/shared/StatusBadge'
import RiskBadge from '@/components/shared/RiskBadge'
import ClaimTypeBadge from '@/components/shared/ClaimTypeBadge'
import ScoreGauge from '@/components/shared/ScoreGauge'
import LoadingState from '@/components/shared/LoadingState'
import { cn } from '@/lib/utils'

const ACTION_CONFIG: Record<
  ReviewAction,
  { label: string; icon: typeof CheckCircle2 }
> = {
  APPROVE: {
    label: '通过',
    icon: CheckCircle2,
  },
  REJECT: {
    label: '退回修改',
    icon: XCircle,
  },
  BLOCK: {
    label: '拦截',
    icon: Ban,
  },
  REQUEST_EVIDENCE: {
    label: '要求补充证据',
    icon: FileQuestion,
  },
}

const CREDIBILITY_CONFIG: Record<string, { label: string; color: string }> = {
  A: { label: 'A级 · 官方披露', color: 'text-[hsl(var(--success))] bg-[hsl(var(--success))/0.1] border-[hsl(var(--success))/0.25]' },
  B: { label: 'B级 · 权威媒体', color: 'text-[hsl(var(--primary))] bg-[hsl(var(--primary))/0.1] border-[hsl(var(--primary))/0.25]' },
  C: { label: 'C级 · 第三方转述', color: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning))/0.1] border-[hsl(var(--warning))/0.25]' },
  D: { label: 'D级 · 未验证信息', color: 'text-muted-foreground bg-muted border-border' },
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function ReviewDetail() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('content')
  const [selectedAction, setSelectedAction] = useState<ReviewAction | null>(null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const {
    data: task,
    isLoading: taskLoading,
    isError: taskError,
  } = useQuery({
    queryKey: ['review-task', taskId],
    queryFn: () => fetchReviewTask(taskId!),
    enabled: !!taskId,
  })

  const {
    data: analysis,
    isLoading: analysisLoading,
    isError: analysisError,
  } = useQuery({
    queryKey: ['analysis', taskId],
    queryFn: () => fetchAnalysis(taskId!),
    enabled: !!taskId,
  })

  const { data: auditLogsData } = useQuery({
    queryKey: ['audit-logs', taskId],
    queryFn: () => fetchAuditLogs({ entity_id: taskId!, entity_type: 'review_task' }),
    enabled: !!taskId,
  })

  const decisionMutation = useMutation({
    mutationFn: () =>
      submitDecision(taskId!, {
        action: selectedAction!,
        comment,
      }),
    onSuccess: () => {
      setSubmitted(true)
      setErrorMsg('')
      queryClient.invalidateQueries({ queryKey: ['review-task', taskId] })
      queryClient.invalidateQueries({ queryKey: ['analysis', taskId] })
      queryClient.invalidateQueries({ queryKey: ['audit-logs', taskId] })
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || '提交失败，请重试')
    },
  })

  const handleSubmit = () => {
    if (!selectedAction) return
    if (!comment.trim()) {
      setErrorMsg('审核意见不能为空')
      return
    }
    setErrorMsg('')
    decisionMutation.mutate()
  }

  const isLoading = taskLoading || analysisLoading
  const isError = taskError || analysisError

  if (isLoading) return <LoadingState text="加载审核详情..." />
  if (isError || !task) {
    return (
      <div className="space-y-3">
        <Link
          to="/queue"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回审核队列
        </Link>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="h-8 w-8 text-[hsl(var(--critical))] mb-3" />
          <p className="text-sm text-[hsl(var(--critical))]">
            任务加载失败，请检查任务是否存在
          </p>
          <Button variant="outline" onClick={() => navigate('/queue')} className="mt-4">
            返回审核队列
          </Button>
        </div>
      </div>
    )
  }

  const auditLogs = auditLogsData?.items ?? []

  const timelineEntries: {
    time: string
    icon: typeof FileText
    title: string
    detail: string
    color: string
  }[] = []

  timelineEntries.push({
    time: task.created_at,
    icon: Clock,
    title: '审校任务创建',
    detail: `任务 ${task.task_number} 已生成，初始评分 ${task.compliance_score} 分`,
    color: 'bg-muted-foreground',
  })

  auditLogs.forEach((log) => {
    let title = '审核操作'
    let color = 'bg-foreground/40'
    if (log.action === 'APPROVE') {
      title = '审核通过'
      color = 'bg-[hsl(var(--success))]'
    } else if (log.action === 'REJECT') {
      title = '退回修改'
      color = 'bg-[hsl(var(--warning))]'
    } else if (log.action === 'BLOCK') {
      title = '拦截'
      color = 'bg-[hsl(var(--critical))]'
    } else if (log.action === 'REQUEST_EVIDENCE') {
      title = '要求补充证据'
      color = 'bg-[hsl(var(--evidence))]'
    }
    timelineEntries.push({
      time: log.timestamp,
      icon: UserIcon,
      title,
      detail: `${log.operator}: ${log.comment || '无备注'}${log.old_status && log.new_status ? ` (${log.old_status} → ${log.new_status})` : ''}`,
      color,
    })
  })

  timelineEntries.sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  )

  const tabItems = [
    { key: 'content', label: '原始内容', icon: FileText, badge: undefined as number | undefined },
    { key: 'hits', label: '风险命中', icon: AlertTriangle, badge: analysis?.risk_hits?.length },
    { key: 'claims', label: '主张分析', icon: Lightbulb, badge: analysis?.claims?.length },
    { key: 'evidence', label: '证据来源', icon: Link2, badge: analysis?.evidence?.length },
  ]

  return (
    <div className="space-y-3">
      {/* Back link */}
      <Link
        to="/queue"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        返回审核队列
      </Link>

      {/* Header card */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Badge variant="outline" className="font-mono text-[11px]">
                  {task.task_number}
                </Badge>
                <StatusBadge status={task.status} />
                <RiskBadge level={task.risk_level} />
              </div>
              <h2 className="text-base font-semibold text-foreground">{task.title}</h2>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">
                  关联标的:{' '}
                  <span className="font-mono text-foreground/70">{task.security_code}</span>
                </span>
                <span className="text-muted-foreground">
                  审核人:{' '}
                  <span className="text-foreground/70">{task.reviewer || '待分配'}</span>
                </span>
                <span className="text-muted-foreground">
                  提交时间:{' '}
                  <span className="text-foreground/70">{formatDateTime(task.created_at)}</span>
                </span>
              </div>
            </div>

            <div className="shrink-0 flex items-start gap-3">
              <ScoreGauge score={task.compliance_score} size="sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="mb-3">
          <TabsList className="w-full">
            {tabItems.map(({ key, label, icon: Icon, badge }) => (
              <TabsTrigger key={key} value={key} className="flex-1 text-xs">
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
                {badge !== undefined && (
                  <span className="ml-1 rounded-full bg-muted-foreground/15 px-1.5 py-0 text-[10px] font-medium text-muted-foreground">
                    {badge}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab Content: Original Text */}
        <TabsContent value="content">
          <Card>
            <CardHeader className="px-4 py-3">
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <CardTitle className="text-sm">AI 生成分析原文</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {analysis ? (
                <div className="rounded-md border border-border bg-background p-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {analysis.original_text}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  暂无原始内容
                </p>
              )}
              {analysis && (analysis.missing_risk_disclosure || analysis.missing_evidence) && (
                <div className="mt-3 space-y-2">
                  {analysis.missing_risk_disclosure && (
                    <div className="flex items-start gap-2 rounded-md border border-[hsl(var(--warning))/0.3] bg-[hsl(var(--warning))/0.06] p-2.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--warning))] mt-0.5 shrink-0" />
                      <p className="text-xs text-[hsl(var(--warning))]">
                        缺少风险揭示声明，建议补充风险提示内容
                      </p>
                    </div>
                  )}
                  {analysis.missing_evidence && (
                    <div className="flex items-start gap-2 rounded-md border border-[hsl(var(--critical))/0.3] bg-[hsl(var(--critical))/0.06] p-2.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--critical))] mt-0.5 shrink-0" />
                      <p className="text-xs text-[hsl(var(--critical))]">
                        部分主张缺少证据来源支持
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Content: Risk Hits */}
        <TabsContent value="hits">
          <Card>
            <CardHeader className="px-4 py-3">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                <CardTitle className="text-sm">风险规则命中项</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {analysis && analysis.risk_hits && analysis.risk_hits.length > 0 ? (
                <div className="space-y-2">
                  {analysis.risk_hits.map((hit, idx) => (
                    <div
                      key={idx}
                      className="rounded-md border border-border bg-background p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <RiskBadge level={hit.risk_level} />
                            <span className="text-sm font-medium text-foreground">
                              {hit.rule_name}
                            </span>
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {hit.rule_id}
                            </Badge>
                          </div>
                          <p className="text-xs text-foreground/70 mt-1.5">
                            匹配模式:{' '}
                            <code className="text-[hsl(var(--critical))] bg-[hsl(var(--critical))/0.1] px-1.5 py-0.5 rounded text-[11px]">
                              {hit.matched_pattern}
                            </code>
                          </p>
                          <div className="mt-2 rounded bg-muted/30 p-2.5 border-l-2 border-[hsl(var(--critical))]">
                            <p className="text-[11px] text-muted-foreground mb-0.5">匹配文本:</p>
                            <p className="text-sm text-foreground leading-relaxed">
                              {hit.matched_text}
                            </p>
                          </div>
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            处理动作: {hit.action}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  无风险命中项
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Content: Claims */}
        <TabsContent value="claims">
          <Card>
            <CardHeader className="px-4 py-3">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
                <CardTitle className="text-sm">文本主张拆解</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {analysis && analysis.claims && analysis.claims.length > 0 ? (
                <div className="space-y-2">
                  {analysis.claims.map((claim) => (
                    <div
                      key={claim.id}
                      className="rounded-md border border-border bg-background p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <ClaimTypeBadge type={claim.claim_type} />
                            {claim.has_evidence ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-[hsl(var(--success))] border-[hsl(var(--success))/0.25]"
                              >
                                有证据
                              </Badge>
                            ) : (
                              <Badge
                                variant="destructive"
                                className="text-[10px]"
                              >
                                无证据
                              </Badge>
                            )}
                            <span className="text-[11px] text-muted-foreground">
                              可信度: {(claim.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed mt-1.5">
                            {claim.text}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  暂无主张分析数据
                </p>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground italic">
                当前为本地规则演示分析，不代表真实模型判定。
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Content: Evidence */}
        <TabsContent value="evidence">
          <Card>
            <CardHeader className="px-4 py-3">
              <div className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                <CardTitle className="text-sm">证据来源</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {analysis && analysis.evidence && analysis.evidence.length > 0 ? (
                <div className="space-y-2">
                  {analysis.evidence.map((ev) => {
                    const cred = CREDIBILITY_CONFIG[ev.credibility] ?? CREDIBILITY_CONFIG.D
                    return (
                      <div
                        key={ev.id}
                        className="rounded-md border border-border bg-background p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Badge
                                variant="outline"
                                className={cn('font-bold text-[10px]', cred.color)}
                              >
                                {cred.label}
                              </Badge>
                              {ev.is_demo && (
                                <Badge variant="secondary" className="text-[10px]">
                                  演示来源
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium text-foreground mt-1.5">
                              {ev.source_name}
                            </p>
                            {ev.source_url && (
                              <a
                                href={ev.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mt-1 text-xs text-primary hover:underline truncate max-w-full"
                              >
                                {ev.source_url}
                              </a>
                            )}
                            <p className="text-sm text-foreground/70 mt-1.5 leading-relaxed">
                              {ev.summary}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  暂无证据来源数据
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Revision suggestions */}
      {analysis && analysis.revision_suggestions && analysis.revision_suggestions.length > 0 && (
        <Card>
          <CardHeader className="px-4 py-3">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
              <CardTitle className="text-sm">合规化改写建议</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {analysis.revision_suggestions.map((sug, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-border bg-background p-3"
                >
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-0.5">原文:</p>
                      <p className="text-sm text-muted-foreground">{sug.original_text}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[hsl(var(--success))] mb-0.5">建议修改:</p>
                      <p className="text-sm text-foreground">{sug.suggested_text}</p>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    理由: {sug.reason}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review decision section */}
      <Card>
        <CardHeader className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
            <CardTitle className="text-sm">审核决定</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {submitted ? (
            <div className="rounded-md border border-[hsl(var(--success))/0.3] bg-[hsl(var(--success))/0.06] p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-[hsl(var(--success))] mx-auto mb-2" />
              <p className="text-sm font-medium text-[hsl(var(--success))]">
                审核决定已提交
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                审计记录已生成，状态已更新
              </p>
              <Button onClick={() => navigate('/queue')} className="mt-3" size="sm">
                返回审核队列
              </Button>
            </div>
          ) : (
            <>
              {/* Action buttons */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(Object.entries(ACTION_CONFIG) as [ReviewAction, typeof ACTION_CONFIG[ReviewAction]][]).map(
                  ([action, cfg]) => {
                    const Icon = cfg.icon
                    const isActive = selectedAction === action
                    return (
                      <Button
                        key={action}
                        variant={isActive ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedAction(action)}
                        className={cn(
                          'text-xs',
                          isActive && action === 'BLOCK' && 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
                          isActive && action === 'REQUEST_EVIDENCE' && 'bg-[hsl(var(--evidence))] text-white hover:bg-[hsl(var(--evidence))/0.85]',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {cfg.label}
                      </Button>
                    )
                  },
                )}
              </div>

              {/* Comment */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                  审核意见 <span className="text-[hsl(var(--critical))]">*</span>
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value)
                    if (errorMsg) setErrorMsg('')
                  }}
                  placeholder="请输入审核意见（必填）..."
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="mb-3 rounded-md border border-[hsl(var(--critical))/0.3] bg-[hsl(var(--critical))/0.06] px-3 py-2">
                  <p className="text-xs text-[hsl(var(--critical))]">{errorMsg}</p>
                </div>
              )}

              {/* Submit */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {selectedAction
                    ? `已选择: ${ACTION_CONFIG[selectedAction].label}`
                    : '请选择审核操作'}
                </p>
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedAction || decisionMutation.isPending}
                  size="sm"
                >
                  {decisionMutation.isPending ? (
                    <>
                      <span className="inline-block h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      提交中...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      提交审核决定
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Audit timeline */}
      <Card>
        <CardHeader className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <CardTitle className="text-sm">操作时间线</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {timelineEntries.length > 0 ? (
            <div className="relative">
              <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border" />
              <div className="space-y-4">
                {timelineEntries.map((entry, idx) => (
                  <div key={idx} className="relative flex gap-3 pl-10">
                    <div
                      className={cn(
                        'absolute left-[13px] top-1 h-2.5 w-2.5 rounded-full border-2 border-card',
                        entry.color,
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{entry.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDateTime(entry.time)}
                      </p>
                      <p className="text-sm text-foreground/70 mt-1">{entry.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              暂无操作记录
            </p>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-center">
        <p className="text-[11px] text-muted-foreground">
          本平台仅用于金融信息内容治理与技术研究演示，不构成任何证券投资建议、投资邀约或收益承诺。证券市场存在风险，投资需谨慎。
        </p>
      </div>
    </div>
  )
}
