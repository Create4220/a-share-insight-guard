import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  History,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Search,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import MetricCard from '@/components/shared/MetricCard'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { fetchAuditLogs, updateAuditLog, revokeAuditLog } from '@/lib/api'
import type { AuditLog } from '@/types'
import LoadingState from '@/components/shared/LoadingState'
import EmptyState from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'analysis', label: '审校记录' },
  { value: 'review_task', label: '审核任务' },
  { value: 'rule', label: '规则变更' },
]

type ActionVariant = 'default' | 'secondary' | 'destructive' | 'outline'

const ACTION_CONFIG: Record<string, { label: string; variant: ActionVariant }> = {
  APPROVE: { label: '审核通过', variant: 'default' },
  REJECT: { label: '退回修改', variant: 'secondary' },
  BLOCK: { label: '拦截', variant: 'destructive' },
  REQUEST_EVIDENCE: { label: '要求补充证据', variant: 'outline' },
  CREATE: { label: '创建', variant: 'default' },
  UPDATE: { label: '更新', variant: 'secondary' },
  TOGGLE: { label: '启用/停用', variant: 'secondary' },
  SUBMIT: { label: '提交审校', variant: 'default' },
}

const PAGE_SIZE = 15

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return `${date}\n${time}`
}

function getEntityTypeLabel(entityType: string): string {
  const found = ENTITY_TYPE_OPTIONS.find((o) => o.value === entityType)
  return found ? found.label : entityType
}

export default function AuditLogs() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [entityTypeFilter, setEntityTypeFilter] = useState('')
  const [searchText, setSearchText] = useState('')
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null)
  const [editComment, setEditComment] = useState('')
  const [savingComment, setSavingComment] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const params: Record<string, string> = {
    page: String(page),
    page_size: String(PAGE_SIZE),
  }
  if (entityTypeFilter) params.entity_type = entityTypeFilter
  if (searchText.trim()) params.search = searchText.trim()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => fetchAuditLogs(params),
  })

  const totalPages = data?.total_pages ?? 0
  const logs = data?.items ?? []
  const total = data?.total ?? 0

  const openDetail = (log: AuditLog) => {
    setDetailLog(log)
    setEditComment(log.comment || '')
  }

  const handleSaveComment = async () => {
    if (!detailLog) return
    setSavingComment(true)
    try {
      await updateAuditLog(detailLog.id, { comment: editComment })
      setDetailLog(null)
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
      showToast('备注已保存', 'success')
    } catch (e) {
      showToast('保存失败，请重试', 'error')
    } finally {
      setSavingComment(false)
    }
  }

  const handleRevoke = async () => {
    if (!detailLog) return
    setRevoking(true)
    try {
      const result = await revokeAuditLog(detailLog.id)
      setDetailLog(null)
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
      queryClient.invalidateQueries({ queryKey: ['review-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      showToast(`已撤回${result.reverse_note ? '：' + result.reverse_note : ''}`, 'success')
    } catch (e: any) {
      showToast(e.message || '撤回失败，请重试', 'error')
    } finally {
      setRevoking(false)
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
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
          toast.type === 'success'
            ? 'bg-[hsl(110,12%,52%)] text-white'
            : 'bg-[hsl(0,85%,45%)] text-white'
        }`}>
          {toast.message}
        </div>
      )}
      {/* Page heading */}
      <div>
        <h2 className="text-base font-semibold text-foreground">审计记录</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          查看所有合规审核操作的审计记录，所有操作均可追溯
        </p>
      </div>

      {/* Stats bar */}
      {data && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="总审计条目" value={total} icon={History} />
          <MetricCard
            label="审核决定"
            value={logs.filter((l) => ['APPROVE', 'REJECT', 'BLOCK', 'REQUEST_EVIDENCE'].includes(l.action)).length}
            icon={CheckCircle2}
            valueClassName="text-[hsl(var(--warning))]"
          />
          <MetricCard
            label="规则变更"
            value={logs.filter((l) => l.entity_type === 'rule').length}
            icon={ShieldCheck}
            valueClassName="text-[hsl(var(--primary))]"
          />
          <MetricCard label="当前页记录" value={logs.length} icon={FileText} />
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select
            value={entityTypeFilter}
            onValueChange={(value) => {
              setEntityTypeFilter(value ?? '')
              setPage(1)
            }}
          >
            <SelectTrigger className="bg-white w-[150px]">
              <SelectValue placeholder="全部类型" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-400">
              {ENTITY_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索操作人或实体ID..."
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
        <LoadingState text="加载审计记录..." />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="h-8 w-8 text-[hsl(var(--critical))] mb-3" />
          <p className="text-sm text-[hsl(var(--critical))]">
            {error instanceof Error ? error.message : '加载失败，请重试'}
          </p>
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          title="暂无审计记录"
          description={
            entityTypeFilter || searchText
              ? '没有匹配的审计记录，请调整筛选条件'
              : '审计日志将在审核操作执行后自动生成并显示在此处'
          }
          icon={History}
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
                    <TableHead className="whitespace-nowrap text-xs h-8">时间</TableHead>
                    <TableHead className="whitespace-nowrap text-xs h-8">操作人</TableHead>
                    <TableHead className="whitespace-nowrap text-xs h-8">操作类型</TableHead>
                    <TableHead className="whitespace-nowrap text-xs h-8">实体类型</TableHead>
                    <TableHead className="whitespace-nowrap text-xs h-8">实体 ID</TableHead>
                    <TableHead className="whitespace-nowrap text-xs h-8">变更前状态</TableHead>
                    <TableHead className="whitespace-nowrap text-xs h-8">变更后状态</TableHead>
                    <TableHead className="whitespace-nowrap text-xs h-8">备注</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: AuditLog, idx: number) => {
                    const actionCfg = ACTION_CONFIG[log.action] || {
                      label: log.action,
                      variant: 'outline' as const,
                    }
                    return (
                      <TableRow
                        key={log.id}
                        className={cn(idx % 2 === 1 && 'bg-muted/20')}
                      >
                        <TableCell className="py-2">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openDetail(log)}
                            title="查看详情"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                        <TableCell className="py-2 whitespace-pre-line text-[11px] text-muted-foreground font-mono leading-snug">
                          {formatDateTime(log.timestamp)}
                        </TableCell>
                        <TableCell className="py-2 text-sm text-foreground/70 leading-snug">
                          {log.operator}
                        </TableCell>
                        <TableCell className="py-2 whitespace-nowrap">
                          <Badge variant={actionCfg.variant} className="text-[10px]">
                            {actionCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 whitespace-nowrap text-sm text-foreground/70">
                          {getEntityTypeLabel(log.entity_type)}
                        </TableCell>
                        <TableCell className="py-2 font-mono text-xs text-primary max-w-[120px] whitespace-normal break-all leading-snug line-clamp-2">
                          {log.entity_id}
                        </TableCell>
                        <TableCell className="py-2 whitespace-nowrap text-xs text-muted-foreground">
                          {log.old_status || '—'}
                        </TableCell>
                        <TableCell className="py-2 whitespace-nowrap text-xs text-muted-foreground">
                          {log.new_status || '—'}
                        </TableCell>
                        <TableCell className="py-2 text-xs text-muted-foreground max-w-[180px] truncate">
                          {log.comment || '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
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
      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-lg border-2 border-border bg-white/97 shadow-xl p-6"><div className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-black font-bold">
              <Eye className="h-4 w-4" />
              审计记录详情
            </DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-3 text-sm text-gray-700">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">时间：</span>{formatDateTime(detailLog.timestamp)}</div>
                <div><span className="text-muted-foreground">操作人：</span>{detailLog.operator}</div>
                <div><span className="text-muted-foreground">操作：</span>{detailLog.action}</div>
                <div><span className="text-muted-foreground">实体类型：</span>{getEntityTypeLabel(detailLog.entity_type)}</div>
                <div className="col-span-2"><span className="text-muted-foreground">实体ID：</span><code className="font-mono">{detailLog.entity_id}</code></div>
                {detailLog.old_status && <div><span className="text-muted-foreground">变更前：</span>{detailLog.old_status}</div>}
                {detailLog.new_status && <div><span className="text-muted-foreground">变更后：</span>{detailLog.new_status}</div>}
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">备注</label>
                <Textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveComment} disabled={savingComment || revoking} size="sm" className="bg-[hsl(110,12%,52%)] hover:bg-[hsl(110,12%,48%)] text-white">
                  {savingComment ? '保存中...' : '保存备注'}
                </Button>
                <Button onClick={handleRevoke} disabled={revoking || savingComment} size="sm" variant="outline" className="border-[hsl(0,35%,55%)] text-[hsl(0,35%,55%)] hover:bg-[hsl(0,35%,55%)]/10">
                  {revoking ? '撤回中...' : '撤回'}
                </Button>
              </div>
            </div>
          )}
        </div></DialogContent>
      </Dialog>
    </div>
  )
}
