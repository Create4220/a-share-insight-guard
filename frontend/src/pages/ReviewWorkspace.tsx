import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  FileSearch,
  AlertTriangle,
  ShieldAlert,
  Send,
  CheckCircle2,
  Info,
  Database,
  ExternalLink,
  BookOpen,
  X,
  Loader2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import EmptyState from '@/components/shared/EmptyState'
import ScoreGauge from '@/components/shared/ScoreGauge'
import StatusBadge from '@/components/shared/StatusBadge'
import RiskBadge from '@/components/shared/RiskBadge'
import ClaimTypeBadge from '@/components/shared/ClaimTypeBadge'
import { submitAnalysis, submitForReview } from '@/lib/api'
import type { AnalysisResult, RiskLevel } from '@/types'
import { cn } from '@/lib/utils'

const demoSamples = [
  {
    label: '低风险示例',
    riskLevel: 'low' as const,
    description: '有来源、措辞审慎、包含风险提示',
    text: '根据演示公告摘要，星河智算披露了阶段性经营信息。相关经营变化是否能够持续，仍需结合后续定期报告、行业环境与市场风险综合判断。本内容仅用于信息整理，不构成投资建议。',
    icon: CheckCircle2,
  },
  {
    label: '中风险示例',
    riskLevel: 'medium' as const,
    description: '有未经充分证实的预测',
    text: '远景新材近期披露的项目进展可能改善市场预期，未来经营表现仍存在不确定性。该判断需要进一步结合公开披露文件验证。',
    icon: AlertTriangle,
  },
  {
    label: '高风险检测样例',
    riskLevel: 'high' as const,
    description: '包含高风险措辞，用于测试拦截',
    text: '【高风险检测样例，请勿作为投资依据】海岚能源明天必涨，现在建议买入，保证获得20%收益。',
    icon: ShieldAlert,
  },
]

function riskLevelTextColor(level: RiskLevel): string {
  switch (level) {
    case 'CRITICAL':
      return 'text-[hsl(0,35%,52%)]'
    case 'HIGH':
      return 'text-[hsl(8,38%,58%)]'
    case 'MEDIUM':
      return 'text-[hsl(38,35%,58%)]'
    default:
      return 'text-[hsl(110,12%,52%)]'
  }
}

const credibilityConfig: Record<string, string> = {
  A: 'bg-[hsl(110,12%,52%)]/10 text-[hsl(110,12%,52%)] border-[hsl(110,12%,52%)]/30',
  B: 'bg-[hsl(210,25%,55%)]/10 text-[hsl(210,25%,55%)] border-[hsl(210,25%,55%)]/30',
  C: 'bg-[hsl(38,35%,58%)]/10 text-[hsl(38,35%,58%)] border-[hsl(38,35%,58%)]/30',
  D: 'bg-muted text-muted-foreground border-border',
}

export default function ReviewWorkspace() {
  const [content, setContent] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null)
  const [submittedReview, setSubmittedReview] = useState(false)

  const analyzeMutation = useMutation({
    mutationFn: (text: string) => submitAnalysis({ content: text }),
    onSuccess: (data) => {
      setResult(data)
      setReviewError(null)
      setReviewSuccess(null)
      setSubmittedReview(false)
    },
    onError: (err: Error) => {
      setReviewError(err.message || '审校请求失败，请检查后端服务是否运行。')
      setResult(null)
    },
  })

  const submitReviewMutation = useMutation({
    mutationFn: (id: string) => submitForReview(id),
    onSuccess: () => {
      setSubmittedReview(true)
      setReviewSuccess('已成功提交人工复核，审核任务已创建。')
      setReviewError(null)
    },
    onError: (err: Error) => {
      setReviewError(err.message || '提交人工复核失败，请重试。')
    },
  })

  const handleAnalyze = () => {
    if (!content.trim()) return
    setReviewError(null)
    setReviewSuccess(null)
    analyzeMutation.mutate(content.trim())
  }

  const handleSubmitReview = () => {
    if (!result?.id) return
    setReviewError(null)
    setReviewSuccess(null)
    submitReviewMutation.mutate(result.id)
  }

  const clearResult = () => {
    setResult(null)
    setReviewError(null)
    setReviewSuccess(null)
    setSubmittedReview(false)
  }

  return (
    <div className="space-y-4">
      {/* Demo sample cards */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 pl-4">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            演示案例
          </span>
          <span className="text-sm text-muted-foreground">
            点击下方按钮一键填入示例文本
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {demoSamples.map((sample) => {
            const Icon = sample.icon
            const isHigh = sample.riskLevel === 'high'
            const isMedium = sample.riskLevel === 'medium'

            return (
              <button
                key={sample.label}
                onClick={() => {
                  setContent(sample.text)
                  setResult(null)
                  setReviewError(null)
                  setReviewSuccess(null)
                }}
                className={cn(
                  'flex items-start gap-2.5 rounded-lg border p-3 pl-4 text-left transition-all cursor-pointer',
                  isHigh
                    ? 'border-[hsl(8,38%,58%)]/30 bg-[hsl(8,38%,58%)]/5 hover:border-[hsl(8,38%,58%)]/50 hover:bg-[hsl(8,38%,58%)]/10'
                    : isMedium
                      ? 'border-[hsl(38,35%,58%)]/30 bg-[hsl(38,35%,58%)]/5 hover:border-[hsl(38,35%,58%)]/50 hover:bg-[hsl(38,35%,58%)]/10'
                      : 'border-[hsl(110,12%,52%)]/30 bg-[hsl(110,12%,52%)]/5 hover:border-[hsl(110,12%,52%)]/50 hover:bg-[hsl(110,12%,52%)]/10',
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 mt-0.5',
                    isHigh
                      ? 'text-[hsl(8,38%,58%)]'
                      : isMedium
                        ? 'text-[hsl(38,35%,58%)]'
                        : 'text-[hsl(110,12%,52%)]',
                  )}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{sample.label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                    {sample.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Input area */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">待审校内容</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              if (result) {
                setResult(null)
                setReviewError(null)
              }
            }}
            placeholder="在此粘贴 AI 生成的金融分析文本，或点击上方演示案例一键填入..."
            className="min-h-[120px] resize-y"
          />

          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              当前为本地规则演示分析，不代表真实模型判定。
            </p>
            <div className="flex items-center gap-2">
              {result && (
                <Button variant="outline" size="sm" onClick={clearResult}>
                  <X className="h-3.5 w-3.5" />
                  清除结果
                </Button>
              )}
              <Button
                onClick={handleAnalyze}
                disabled={!content.trim() || analyzeMutation.isPending}
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    审校中...
                  </>
                ) : (
                  <>
                    <FileSearch className="h-4 w-4" />
                    开始审校
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error toast */}
      {reviewError && (
        <div className="flex items-start gap-3 rounded-lg border border-[hsl(8,38%,58%)]/30 bg-[hsl(8,38%,58%)]/8 p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[hsl(8,38%,58%)] mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[hsl(8,38%,58%)]">操作失败</p>
            <p className="text-xs text-foreground/70 mt-0.5">{reviewError}</p>
          </div>
          <button
            onClick={() => setReviewError(null)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Success toast */}
      {reviewSuccess && (
        <div className="flex items-start gap-3 rounded-lg border border-[hsl(110,12%,52%)]/30 bg-[hsl(110,12%,52%)]/8 p-3">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(110,12%,52%)] mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[hsl(110,12%,52%)]">操作成功</p>
            <p className="text-xs text-foreground/70 mt-0.5">{reviewSuccess}</p>
          </div>
          <button
            onClick={() => setReviewSuccess(null)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Score + Status Summary */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-8">
                <div className="flex flex-col items-center">
                  <ScoreGauge score={result.compliance_score} size="md" />
                </div>
                <div className="flex-1 space-y-3 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      处理状态
                    </span>
                    <StatusBadge status={result.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      风险等级
                    </span>
                    <RiskBadge level={result.risk_level} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      合规评分
                    </span>
                    <span
                      className={cn(
                        'text-base font-bold',
                        riskLevelTextColor(result.risk_level),
                      )}
                    >
                      {result.compliance_score}
                    </span>
                    <span className="text-xs text-muted-foreground">/ 100</span>
                  </div>
                  {result.missing_risk_disclosure && (
                    <div className="flex items-center gap-1.5 text-xs text-[hsl(38,35%,58%)]">
                      <AlertTriangle className="h-3 w-3" />
                      缺少风险揭示，已扣 10 分
                    </div>
                  )}
                  {result.missing_evidence && (
                    <div className="flex items-center gap-1.5 text-xs text-[hsl(38,35%,58%)]">
                      <AlertTriangle className="h-3 w-3" />
                      缺少证据来源，已扣 15 分
                    </div>
                  )}

                  {/* Submit for review */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {result.review_task_id ? (
                      <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30 px-3 py-2 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
                        <span className="text-[hsl(var(--warning))]">
                          已自动创建审核任务：{result.review_task_number}
                        </span>
                      </div>
                    ) : result.status === 'APPROVED' ? (
                      <span className="text-xs text-muted-foreground">
                        该内容已通过审校，无需提交人工复核。
                      </span>
                    ) : (
                      <Button
                        onClick={handleSubmitReview}
                        disabled={submittedReview || submitReviewMutation.isPending}
                        size="sm"
                      >
                        {submitReviewMutation.isPending ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            提交中...
                          </>
                        ) : submittedReview ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            已提交复核
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            提交人工复核
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Hits */}
          {result.risk_hits && result.risk_hits.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-[hsl(8,38%,58%)]" />
                  <CardTitle>风险规则命中</CardTitle>
                  <Badge variant="destructive" className="text-[10px]">
                    {result.risk_hits.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.risk_hits.map((hit, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-border bg-muted/30 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {hit.rule_id}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">
                          {hit.rule_name}
                        </span>
                        <RiskBadge level={hit.risk_level} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          命中模式:
                          <code className="ml-1.5 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-[hsl(38,35%,58%)]">
                            {hit.matched_pattern}
                          </code>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          匹配原文:
                          <span className="ml-1.5 rounded bg-[hsl(8,38%,58%)]/10 px-1.5 py-0.5 text-xs text-[hsl(8,38%,58%)] font-medium">
                            "{hit.matched_text}"
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.risk_hits && result.risk_hits.length === 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-[hsl(110,12%,52%)]" />
                  <CardTitle>风险规则命中</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 rounded-lg border border-[hsl(110,12%,52%)]/20 bg-[hsl(110,12%,52%)]/5 p-3">
                  <CheckCircle2 className="h-4 w-4 text-[hsl(110,12%,52%)]" />
                  <p className="text-sm text-foreground/70">
                    未命中已知风险规则
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Claims */}
          {result.claims && result.claims.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <CardTitle>文本主张分析</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {result.claims.length} 项主张
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {result.claims.map((claim) => (
                    <div
                      key={claim.id}
                      className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-2.5"
                    >
                      <ClaimTypeBadge type={claim.claim_type} />
                      <p className="flex-1 text-sm text-foreground leading-relaxed">
                        {claim.text}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        {claim.has_evidence ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[hsl(110,12%,52%)]">
                            <CheckCircle2 className="h-3 w-3" />
                            有证据
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <AlertTriangle className="h-3 w-3" />
                            无证据
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evidence */}
          {result.evidence && result.evidence.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-[hsl(260,12%,55%)]" />
                  <CardTitle>证据来源</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {result.evidence.length} 项来源（均为演示数据）
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {result.evidence.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-2.5"
                    >
                      <span
                        className={cn(
                          'inline-flex items-center justify-center w-5 h-5 shrink-0 rounded border text-[11px] font-bold',
                          credibilityConfig[ev.credibility] || credibilityConfig.D,
                        )}
                      >
                        {ev.credibility}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {ev.source_name}
                          </span>
                          {ev.is_demo && (
                            <Badge variant="outline" className="text-[10px]">
                              演示来源
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-foreground/70 mt-0.5 leading-relaxed">
                          {ev.summary}
                        </p>
                        {ev.source_url && (
                          <a
                            href={ev.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            查看来源
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.evidence && result.evidence.length === 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <CardTitle>证据来源</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 rounded-lg border border-[hsl(38,35%,58%)]/20 bg-[hsl(38,35%,58%)]/5 p-3">
                  <AlertTriangle className="h-4 w-4 text-[hsl(38,35%,58%)]" />
                  <p className="text-sm text-foreground/70">
                    未找到匹配的证据来源。建议补充权威渠道的公开信息作为支持。
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Revision Suggestions */}
          {result.revision_suggestions && result.revision_suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileSearch className="h-4 w-4 text-[hsl(38,35%,58%)]" />
                  <CardTitle>合规化改写建议</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {result.revision_suggestions.length} 项建议
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.revision_suggestions.map((sug, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-border bg-muted/20 p-3"
                    >
                      <div className="space-y-2">
                        <div>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            原文
                          </span>
                          <p className="text-sm text-foreground/70 mt-0.5 bg-muted/50 rounded p-2">
                            {sug.original_text}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-medium text-[hsl(110,12%,52%)] uppercase tracking-wider">
                            建议改为
                          </span>
                          <p className="text-sm text-foreground mt-0.5 bg-[hsl(110,12%,52%)]/5 rounded p-2 border border-[hsl(110,12%,52%)]/10">
                            {sug.suggested_text}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            原因
                          </span>
                          <p className="text-xs text-foreground/70 mt-0.5">{sug.reason}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All-clear summary */}
          {!result.missing_risk_disclosure &&
            !result.missing_evidence &&
            result.risk_hits.length === 0 && (
              <div className="rounded-lg border border-[hsl(110,12%,52%)]/20 bg-[hsl(110,12%,52%)]/5 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[hsl(110,12%,52%)]" />
                  <p className="text-sm text-foreground/70">
                    该内容未命中已知风险规则，包含风险揭示与证据来源。建议结合业务场景进一步确认。
                  </p>
                </div>
              </div>
            )}

          {/* Disclaimer */}
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-center">
            <p className="text-[11px] text-muted-foreground">
              本平台仅用于金融信息内容治理与技术研究演示，不构成任何证券投资建议、投资邀约或收益承诺。证券市场存在风险，投资需谨慎。所有审校结果均为本地规则演示分析，相关证据为演示数据，不代表真实模型判定。
            </p>
          </div>
        </div>
      )}

      {/* Empty state when no content and no result */}
      {!content && !result && !analyzeMutation.isPending && (
        <EmptyState
          title="开始内容审校"
          description="在上方选择一个演示案例并点击「开始审校」，或粘贴一段 AI 生成的金融分析文本。系统将基于本地规则对内容进行合规分析。"
          icon={FileSearch}
        />
      )}
    </div>
  )
}
