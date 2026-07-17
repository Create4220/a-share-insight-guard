import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  ShieldAlert,
  ClipboardList,
  CheckCircle2,
  FileSearch,
  AlertTriangle,
  Clock,
  Eye,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import MetricCard from '@/components/shared/MetricCard'
import LoadingState from '@/components/shared/LoadingState'
import EmptyState from '@/components/shared/EmptyState'
import RiskBadge from '@/components/shared/RiskBadge'
import StatusBadge from '@/components/shared/StatusBadge'
import {
  fetchDashboardSummary,
  fetchRiskTrend,
  fetchRiskDistribution,
  fetchPendingTasks,
  fetchAnalysis,
  updateRiskLevel,
} from '@/lib/api'
import type { RiskTrendPoint, RiskDistribution, AnalysisResult } from '@/types'

function TrendChart({ data }: { data: RiskTrendPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-xs text-muted-foreground">
        暂无趋势数据
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(35 12% 88%)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: 'hsl(30 5% 48%)' }}
          axisLine={{ stroke: 'hsl(35 12% 84%)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'hsl(30 5% 48%)' }}
          axisLine={{ stroke: 'hsl(35 12% 84%)' }}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(36 30% 99%)',
            border: '1px solid hsl(35 12% 84%)',
            borderRadius: 8,
            fontSize: 12,
            color: 'hsl(30 8% 18%)',
          }}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="hsl(210 25% 55%)"
          strokeWidth={2}
          dot={{ fill: 'hsl(210 25% 55%)', r: 3, strokeWidth: 0 }}
          name="总数"
        />
        <Line
          type="monotone"
          dataKey="high_risk"
          stroke="hsl(45 90% 40%)"
          strokeWidth={2}
          dot={{ fill: 'hsl(45 90% 40%)', r: 3, strokeWidth: 0 }}
          name="高风险"
        />
        <Line
          type="monotone"
          dataKey="critical"
          stroke="hsl(0 85% 45%)"
          strokeWidth={2}
          dot={{ fill: 'hsl(0 85% 45%)', r: 3, strokeWidth: 0 }}
          name="严重风险"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function DistributionChart({ data }: { data: RiskDistribution[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-xs text-muted-foreground">
        暂无分布数据
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(35 12% 88%)" />
        <XAxis
          dataKey="category"
          tick={{ fontSize: 11, fill: 'hsl(30 5% 48%)' }}
          axisLine={{ stroke: 'hsl(35 12% 84%)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'hsl(30 5% 48%)' }}
          axisLine={{ stroke: 'hsl(35 12% 84%)' }}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(36 30% 99%)',
            border: '1px solid hsl(35 12% 84%)',
            borderRadius: 8,
            fontSize: 12,
            color: 'hsl(30 8% 18%)',
          }}
        />
        <Bar
          dataKey="count"
          fill="hsl(210 25% 55%)"
          radius={[4, 4, 0, 0]}
          name="命中次数"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

function PendingTasksList({
  tasks,
  onOpenDetail,
}: {
  tasks: {
    id: string
    task_number: string
    title: string
    security_code: string
    risk_level: string
    status: string
    created_at: string
  }[]
  onOpenDetail: (task: any) => void
}) {
  if (!tasks || tasks.length === 0) {
    return (
      <EmptyState
        title="无待处理任务"
        description="当前没有需要人工复核的高风险任务。"
        icon={CheckCircle2}
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10" />
          <TableHead>任务编号</TableHead>
          <TableHead>内容标题</TableHead>
          <TableHead>关联标的</TableHead>
          <TableHead>风险等级</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>提交时间</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell>
              <Button variant="ghost" size="icon-xs" onClick={() => onOpenDetail(task)} title="查看详情">
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </TableCell>
            <TableCell className="font-mono text-xs text-primary">
              {task.task_number}
            </TableCell>
            <TableCell className="max-w-40 truncate text-sm text-foreground">
              {task.title}
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {task.security_code}
            </TableCell>
            <TableCell>
              <RiskBadge level={task.risk_level as import('@/types').RiskLevel} />
            </TableCell>
            <TableCell>
              <StatusBadge status={task.status as import('@/types').ReviewStatus} />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {task.created_at}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default function Dashboard() {
  const queryClient = useQueryClient()
  const [detailTask, setDetailTask] = useState<any>(null)
  const [detailAnalysis, setDetailAnalysis] = useState<AnalysisResult | null>(null)
  const [newRiskLevel, setNewRiskLevel] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [adjustComment, setAdjustComment] = useState('')
  const [saving, setSaving] = useState(false)

  const openDetail = async (task: any) => {
    setDetailTask(task)
    setNewRiskLevel(task.risk_level)
    setNewStatus(task.status)
    setAdjustComment('')
    const analysisId = task.analysis_id || task.id
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
      const analysisId = detailTask.analysis_id || detailTask.id
      await updateRiskLevel(analysisId, {
        risk_level: newRiskLevel,
        status: newStatus,
        comment: adjustComment || '手动调整风险等级与状态',
      })
      setDetailTask(null)
      setDetailAnalysis(null)
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-pending-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['review-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
  })

  const {
    data: trendData,
    isLoading: trendLoading,
    isError: trendError,
  } = useQuery({
    queryKey: ['dashboard-risk-trend'],
    queryFn: fetchRiskTrend,
  })

  const {
    data: distributionData,
    isLoading: distLoading,
    isError: distError,
  } = useQuery({
    queryKey: ['dashboard-risk-distribution'],
    queryFn: fetchRiskDistribution,
  })

  const {
    data: pendingTasks,
    isLoading: tasksLoading,
    isError: tasksError,
  } = useQuery({
    queryKey: ['dashboard-pending-tasks'],
    queryFn: fetchPendingTasks,
  })

  const isLoading = summaryLoading || trendLoading || distLoading || tasksLoading
  const isError = summaryError || trendError || distError || tasksError

  if (isLoading) {
    return <LoadingState text="加载合规概览数据..." />
  }

  if (isError) {
    return (
      <EmptyState
        title="数据加载失败"
        description="无法连接到后端服务，请确认后端已启动并运行在 localhost:8000。"
        icon={AlertTriangle}
        action={
          <Button onClick={() => window.location.reload()}>重试</Button>
        }
      />
    )
  }

  if (!summary) {
    return (
      <EmptyState
        title="暂无数据"
        description="当前没有合规审校数据。请先提交内容进行审校。"
        icon={ShieldAlert}
        action={
          <Link to="/review">
            <Button>
              <FileSearch className="h-4 w-4" />
              新建内容审校
            </Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="今日审校" value={summary.total_analyses_today} icon={TrendingUp} />
        <MetricCard
          label="高风险内容"
          value={summary.high_risk_count}
          icon={ShieldAlert}
          valueClassName={
            summary.high_risk_count > 0
              ? 'text-[hsl(8,38%,58%)]'
              : 'text-foreground'
          }
        />
        <MetricCard
          label="待人工复核"
          value={summary.pending_review_count}
          icon={ClipboardList}
          valueClassName={
            summary.pending_review_count > 0
              ? 'text-[hsl(38,35%,58%)]'
              : 'text-foreground'
          }
        />
        <MetricCard
          label="已通过"
          value={summary.approved_count}
          icon={CheckCircle2}
          valueClassName="text-[hsl(110,12%,52%)]"
        />
      </div>

      {/* Quick action */}
      <div className="flex items-center gap-3">
        <Link to="/review">
          <Button>
            <FileSearch className="h-4 w-4" />
            新建内容审校
          </Button>
        </Link>
        {summary.avg_compliance_score > 0 && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
            <span className="text-muted-foreground">平均合规评分</span>
            <span className="font-bold text-foreground">
              {summary.avg_compliance_score}
            </span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle>最近 7 天风险趋势</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <TrendChart data={trendData ?? []} />
            <p className="mt-2 text-[11px] text-muted-foreground">
              演示数据 · 仅用于功能展示
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[hsl(38,35%,58%)]" />
              <CardTitle>风险类别分布</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <DistributionChart data={distributionData ?? []} />
            <p className="mt-2 text-[11px] text-muted-foreground">
              演示数据 · 仅用于功能展示
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending high-risk tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[hsl(8,38%,58%)]" />
            <CardTitle>待处理高风险任务</CardTitle>
            {pendingTasks && pendingTasks.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-[hsl(8,38%,58%)]/15 text-[11px] font-bold text-[hsl(8,38%,58%)] px-1.5">
                {pendingTasks.length}
              </span>
            )}
            <div className="flex-1" />
            <Link
              to="/queue"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              查看全部 →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <PendingTasksList tasks={pendingTasks ?? []} onOpenDetail={openDetail} />
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailTask} onOpenChange={() => setDetailTask(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto border-2 border-border bg-white/97 shadow-xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-black font-bold">
              <Eye className="h-4 w-4" />
              任务详情 — {detailTask?.task_number}
            </DialogTitle>
          </DialogHeader>
          {detailAnalysis && (
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <p className="font-medium text-gray-800 mb-1">原始内容</p>
                <p className="rounded-lg bg-muted p-3 text-xs leading-relaxed whitespace-pre-wrap">{detailAnalysis.original_text}</p>
              </div>
              {detailAnalysis.risk_hits.length > 0 && (
                <div>
                  <p className="font-medium text-gray-800 mb-1">风险命中（共 {detailAnalysis.risk_hits.length} 项）</p>
                  <div className="space-y-1.5">
                    {detailAnalysis.risk_hits.map((h: any, i: number) => (
                      <div key={i} className="rounded border border-border p-2.5 text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <RiskBadge level={h.risk_level} />
                          <span className="font-medium">{h.rule_name}</span>
                          <span className="text-muted-foreground font-mono text-xs">{h.rule_id}</span>
                        </div>
                        {h.matched_text && <p className="font-mono text-muted-foreground bg-muted rounded p-1.5 mt-1">匹配内容：...{h.matched_text}...</p>}
                        <p className="text-muted-foreground mt-0.5">触发模式：{h.matched_pattern}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-t border-border pt-3 space-y-3">
                <p className="font-medium text-gray-800">调整风险等级与状态</p>
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
                  <Textarea value={adjustComment} onChange={(e) => setAdjustComment(e.target.value)} placeholder="请输入调整原因..." className="mt-1" rows={2} />
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
        </DialogContent>
      </Dialog>
    </div>
  )
}
