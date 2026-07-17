import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  AlertTriangle,
  ShieldAlert,
  FileText,
  Clock,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import MetricCard from '@/components/shared/MetricCard'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { fetchReviewTasks, fetchAnalysis, updateRiskLevel } from '@/lib/api'
import type { ReviewTask, AnalysisResult } from '@/types'
import StatusBadge from '@/components/shared/StatusBadge'
import RiskBadge from '@/components/shared/RiskBadge'
import LoadingState from '@/components/shared/LoadingState'
import EmptyState from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function scoreStyle(score: number): string {
  if (score >= 85) return 'text-[hsl(var(--success))] bg-[hsl(var(--success))/0.12]'
  if (score >= 70) return 'text-[hsl(var(--primary))] bg-[hsl(var(--primary))/0.12]'
  if (score >= 50) return 'text-[hsl(var(--warning))] bg-[hsl(var(--warning))/0.12]'
  return 'text-[hsl(var(--critical))] bg-[hsl(var(--critical))/0.12]'
}

export default function ReviewQueue() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [searchText, setSearchText] = useState('')
  const [detailTask, setDetailTask] = useState<ReviewTask | null>(null)
  const [detailAnalysis, setDetailAnalysis] = useState<AnalysisResult | null>(null)
  const [newRiskLevel, setNewRiskLevel] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [adjustComment, setAdjustComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const params: Record<string, string> = {
    page: String(page),
    page_size: String(PAGE_SIZE),
  }
  if (statusFilter) params.status = statusFilter
  if (riskFilter) params.risk_level = riskFilter
  if (searchText.trim()) params.search = searchText.trim()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['review-tasks', params],
    queryFn: () => fetchReviewTasks(params),
  })

  const totalPages = data?.total_pages ?? 0
  const tasks = data?.items ?? []
  const total = data?.total ?? 0

  const openDetail = async (task: ReviewTask & { analysis_id?: string }) => {
    setDetailTask(task)
    setNewRiskLevel(task.risk_level)
    setNewStatus(task.status)
    setAdjustComment('')
    const analysisId = (task as any).analysis_id || task.id
    try {
      const analysis = await fetchAnalysis(analysisId)
      setDetailAnalysis(analysis as unknown as AnalysisResult)
    } catch {
      setDetailAnalysis(null)
    }
  }

  const handleSaveAdjustment = async () => {
    if (!detailTask) return
    setSaving(true)
    try {
      const analysisId = (detailTask as any).analysis_id || detailTask.id
      await updateRiskLevel(analysisId, {
        risk_level: newRiskLevel,
        status: newStatus,
        comment: adjustComment || '手动调整风险等级与状态',
      })
      setDetailTask(null)
      setDetailAnalysis(null)
      queryClient.invalidateQueries({ queryKey: ['review-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
      showToast('风险等级与状态已保存，审计记录已更新', 'success')
    } catch (e) {
      showToast('保存失败，请重试', 'error')
    } finally {
      setSaving(false)
    }
  }

  function buildPageNumbers(): (number | 'ellipsis')[] {
    const pages: (number | 'ellipsis')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
      return pages
    }
    pages.push(1)
    if (page > 3) pages.push('ellipsis')
    const start = Math.max(2, page - 1)
    const end = Math.min(totalPages - 1, page + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (page < totalPages - 2) pages.push('ellipsis')
    pages.push(totalPages)
    return pages
  }

  return (
    <div className="space-y-3">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2 ${
          toast.type === 'success'
            ? 'bg-[hsl(110,12%,52%)] text-white'
            : 'bg-[hsl(0,85%,45%)] text-white'
        }`}>
          {toast.message}
        </div>
      )}
      {/* Page heading */}
      <div>
        <h2 className="text-base font-semibold text-foreground">审核任务队列</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          管理和审核待处理的合规审校任务
        </p>
      </div>

      {/* Stats bar */}
      {data && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="总任务数" value={total} icon={ClipboardList} />
          <MetricCard
            label="待人工复核"
            value={tasks.filter((t) => t.status === 'NEEDS_MANUAL_REVIEW').length}
            icon={Clock}
            valueClassName="text-[hsl(var(--warning))]"
          />
          <MetricCard
            label="高风险及以上"
            value={tasks.filter((t) => t.risk_level === 'HIGH' || t.risk_level === 'CRITICAL').length}
            icon={ShieldAlert}
            valueClassName="text-[hsl(var(--danger))]"
          />
          <MetricCard label="当前页" value={tasks.length} icon={FileText} />
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value ?? '')
              setPage(1)
            }}
          >
            <SelectTrigger className="bg-white w-[150px]">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-400">
              <SelectItem value="">全部状态</SelectItem>
              <SelectItem value="APPROVED">已通过</SelectItem>
              <SelectItem value="NEEDS_REVISION">需修改</SelectItem>
              <SelectItem value="NEEDS_MANUAL_REVIEW">待人工复核</SelectItem>
              <SelectItem value="BLOCKED">已拦截</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select
          value={riskFilter}
          onValueChange={(value) => {
            setRiskFilter(value ?? '')
            setPage(1)
          }}
        >
          <SelectTrigger className="bg-white w-[200px]">
            <SelectValue placeholder="全部风险等级" />
          </SelectTrigger>
          <SelectContent className="bg-white border border-gray-400">
            <SelectItem value="">全部风险等级</SelectItem>
            <SelectItem value="LOW">低风险</SelectItem>
            <SelectItem value="MEDIUM">中风险</SelectItem>
            <SelectItem value="HIGH">高风险</SelectItem>
            <SelectItem value="CRITICAL">严重风险</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索任务编号或证券标识..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState text="加载审核任务..." />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="h-8 w-8 text-[hsl(var(--critical))] mb-3" />
          <p className="text-sm text-[hsl(var(--critical))]">
            {error instanceof Error ? error.message : '加载失败，请重试'}
          </p>
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="暂无审核任务"
          description={
            searchText || statusFilter || riskFilter
              ? '没有匹配的筛选结果，请调整筛选条件'
              : '审核任务将在内容审校提交后出现在此列表中'
          }
          icon={ClipboardList}
        />
      ) : (
        <>
          <div className="h-2" />
          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="whitespace-nowrap text-xs h-8 w-10" />
                    <TableHead className="whitespace-nowrap text-xs h-8">任务编号</TableHead>
                    <TableHead className="whitespace-nowrap text-xs h-8">内容标题</TableHead>
                    <TableHead className="whitespace-nowrap text-xs h-8 text-center">
                      关联标的
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-xs h-8 text-center">
                      合规评分
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-xs h-8 text-center">
                      风险等级
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-xs h-8 text-center">
                      审核状态
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-xs h-8">审核人</TableHead>
                    <TableHead className="whitespace-nowrap text-xs h-8">提交时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task: ReviewTask, idx: number) => (
                    <TableRow
                      key={task.id}
                      className={idx % 2 === 1 ? 'bg-muted/20' : ''}
                    >
                      <TableCell className="py-2">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={(e) => { e.stopPropagation(); openDetail(task) }}
                          title="查看详情"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                      <TableCell className="py-3 font-mono text-xs text-primary">
                        {task.task_number}
                      </TableCell>
                      <TableCell className="py-3 max-w-[200px] truncate text-sm text-foreground">
                        {task.title}
                      </TableCell>
                      <TableCell className="py-3 text-center font-mono text-xs text-foreground/70">
                        {task.security_code}
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center w-9 h-5 rounded text-[11px] font-bold',
                            scoreStyle(task.compliance_score),
                          )}
                        >
                          {task.compliance_score}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <RiskBadge level={task.risk_level} />
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <StatusBadge status={task.status} />
                      </TableCell>
                      <TableCell className="py-3 text-sm text-foreground/70">
                        {task.reviewer || '—'}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground">
                        {formatDateTime(task.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                共 {total} 条记录，第 {page} / {totalPages} 页
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>

                {buildPageNumbers().map((p, i) =>
                  p === 'ellipsis' ? (
                    <span
                      key={`ellipsis-${i}`}
                      className="inline-flex items-center justify-center h-7 w-7 text-xs text-muted-foreground"
                    >
                      ...
                    </span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === page ? 'default' : 'outline'}
                      size="icon-sm"
                      onClick={() => setPage(p)}
                      className="text-xs font-medium"
                    >
                      {p}
                    </Button>
                  ),
                )}

                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailTask} onOpenChange={() => setDetailTask(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto border-2 border-border bg-white/97 shadow-xl p-6"><div className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-black font-bold">
              <Eye className="h-4 w-4" />
              任务详情 — {detailTask?.task_number}
            </DialogTitle>
          </DialogHeader>
          {detailAnalysis && (
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <p className="font-medium text-gray-800 mb-1">内容标题</p>
                <p className="text-xs">{detailTask?.title || '（无标题）'}</p>
                {detailTask?.security_code && <p className="text-xs text-muted-foreground">关联标的：{detailTask.security_code}</p>}
              </div>
              <div>
                <p className="font-medium text-gray-800 mb-1">原始内容</p>
                <p className="rounded-lg bg-muted p-3 text-xs leading-relaxed whitespace-pre-wrap">{detailAnalysis.original_text}</p>
              </div>
              {detailAnalysis.claims && detailAnalysis.claims.length > 0 && (
                <div>
                  <p className="font-medium text-gray-800 mb-1">主张分析</p>
                  <div className="space-y-1">
                    {detailAnalysis.claims.map((c: any, i: number) => (
                      <div key={i} className="flex items-start justify-between gap-2 rounded bg-muted/50 p-1.5 text-xs">
                        <span>{c.text}</span>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          c.claim_type === 'GUIDANCE' ? 'bg-[hsl(var(--danger))]/10 text-[hsl(var(--danger))]' :
                          c.claim_type === 'FORECAST' ? 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]' :
                          c.claim_type === 'FACT' ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]' :
                          c.claim_type === 'RISK_DISCLOSURE' ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' :
                          'bg-muted text-muted-foreground'
                        }`}>{c.claim_type === 'FACT' ? '事实' : c.claim_type === 'OPINION' ? '观点' : c.claim_type === 'FORECAST' ? '预测' : c.claim_type === 'GUIDANCE' ? '操作引导' : c.claim_type === 'RISK_DISCLOSURE' ? '风险揭示' : c.claim_type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {detailAnalysis.risk_hits.length > 0 && (
                <div>
                  <p className="font-medium text-gray-800 mb-1">风险命中（共 {detailAnalysis.risk_hits.length} 项）</p>
                  <div className="space-y-1.5">
                    {detailAnalysis.risk_hits.map((h: any, i: number) => (
                      <div key={i} className="rounded border border-border p-2.5 text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <RiskBadge level={h.risk_level} />
                          <span className="font-medium">{h.rule_name}</span>
                          <span className="text-muted-foreground font-mono text-[10px]">{h.rule_id}</span>
                        </div>
                        {h.matched_text && <p className="font-mono text-muted-foreground bg-muted rounded p-1.5 mt-1">匹配内容：...{h.matched_text}...</p>}
                        <p className="text-muted-foreground mt-0.5">触发模式：{h.matched_pattern}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {detailAnalysis.evidence && detailAnalysis.evidence.length > 0 && (
                <div>
                  <p className="font-medium text-gray-800 mb-1">证据来源（演示数据）</p>
                  <div className="space-y-1">
                    {detailAnalysis.evidence.map((e: any, i: number) => (
                      <div key={i} className="rounded bg-muted/50 p-2 text-xs">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium mr-1.5 ${
                          e.credibility === 'A' ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' :
                          e.credibility === 'B' ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]' :
                          'bg-muted text-muted-foreground'
                        }`}>{e.credibility}级</span>
                        <span className="font-medium">{e.source_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-t border-border pt-3 space-y-3">
                <p className="font-medium text-foreground">调整风险等级与状态</p>
                <div className="flex gap-3 flex-wrap">
                  <div>
                    <label className="text-xs text-muted-foreground">风险等级</label>
                    <Select value={newRiskLevel} onValueChange={(value) => setNewRiskLevel(value ?? '')}>
                      <SelectTrigger className="bg-white w-[120px] mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-400">
                        <SelectItem value="LOW">低风险</SelectItem>
                        <SelectItem value="MEDIUM">中风险</SelectItem>
                        <SelectItem value="HIGH">高风险</SelectItem>
                        <SelectItem value="CRITICAL">严重风险</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">审核状态</label>
                    <Select value={newStatus} onValueChange={(value) => setNewStatus(value ?? '')}>
                      <SelectTrigger className="bg-white w-[130px] mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-400">
                        <SelectItem value="APPROVED">已通过</SelectItem>
                        <SelectItem value="NEEDS_REVISION">需修改</SelectItem>
                        <SelectItem value="NEEDS_MANUAL_REVIEW">待人工复核</SelectItem>
                        <SelectItem value="BLOCKED">已拦截</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">调整说明</label>
                  <Textarea
                    value={adjustComment}
                    onChange={(e) => setAdjustComment(e.target.value)}
                    placeholder="请输入调整原因..."
                    className="mt-1"
                    rows={2}
                  />
                </div>
                <Button onClick={handleSaveAdjustment} disabled={saving} size="sm" className="bg-[hsl(110,12%,52%)] hover:bg-[hsl(110,12%,48%)] text-white">
                  {saving ? '保存中...' : '保存调整'}
                </Button>
              </div>
            </div>
          )}
          {!detailAnalysis && (
            <div className="py-8 text-center text-sm text-muted-foreground">加载详情中...</div>
          )}
        </div></DialogContent>
      </Dialog>
    </div>
  )
}
