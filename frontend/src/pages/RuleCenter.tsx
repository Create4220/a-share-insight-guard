import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShieldCheck,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Save,
  AlertTriangle,
  Pencil,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toggle } from '@/components/ui/toggle'
import { fetchRules, createRule, updateRule, toggleRule } from '@/lib/api'
import type { Rule, RiskLevel } from '@/types'
import RiskBadge from '@/components/shared/RiskBadge'
import LoadingState from '@/components/shared/LoadingState'
import EmptyState from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'

const RISK_LEVELS: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const ACTIONS = ['PASS', 'REQUIRE_EVIDENCE', 'REQUIRE_REVISION', 'MANUAL_REVIEW', 'BLOCK']

const ACTION_LABELS: Record<string, string> = {
  PASS: '通过',
  REQUIRE_EVIDENCE: '要求提供证据',
  REQUIRE_REVISION: '要求修改',
  MANUAL_REVIEW: '人工复核',
  BLOCK: '拦截',
}

const ACTION_COLORS: Record<string, string> = {
  PASS: 'text-[hsl(var(--success))] bg-[hsl(var(--success))/0.1] border-[hsl(var(--success))/0.25]',
  REQUIRE_EVIDENCE: 'text-[hsl(var(--primary))] bg-[hsl(var(--primary))/0.1] border-[hsl(var(--primary))/0.25]',
  REQUIRE_REVISION: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning))/0.1] border-[hsl(var(--warning))/0.25]',
  MANUAL_REVIEW: 'text-[hsl(var(--danger))] bg-[hsl(var(--danger))/0.1] border-[hsl(var(--danger))/0.25]',
  BLOCK: 'text-[hsl(var(--critical))] bg-[hsl(var(--critical))/0.1] border-[hsl(var(--critical))/0.25]',
}

const RISK_FILTERS = [
  { value: '', label: '全部' },
  { value: 'LOW', label: '低风险' },
  { value: 'MEDIUM', label: '中风险' },
  { value: 'HIGH', label: '高风险' },
  { value: 'CRITICAL', label: '严重' },
]

interface RuleFormData {
  rule_id: string
  name: string
  description: string
  risk_level: RiskLevel
  action: string
  patterns: string
  enabled: boolean
}

const emptyForm: RuleFormData = {
  rule_id: '',
  name: '',
  description: '',
  risk_level: 'MEDIUM',
  action: 'MANUAL_REVIEW',
  patterns: '',
  enabled: true,
}

export default function RuleCenter() {
  const queryClient = useQueryClient()
  const [riskFilter, setRiskFilter] = useState('')
  const [searchText, setSearchText] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [form, setForm] = useState<RuleFormData>(emptyForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')

  const params: Record<string, string> = {}
  if (riskFilter) params.risk_level = riskFilter

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['rules', params],
    queryFn: () => fetchRules(params),
  })

  const createMutation = useMutation({
    mutationFn: (ruleData: Partial<Rule>) => createRule(ruleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] })
      closeDialog()
    },
    onError: (err: Error) => setSubmitError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Rule> }) => updateRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] })
      closeDialog()
    },
    onError: (err: Error) => setSubmitError(err.message),
  })

  const toggleMutation = useMutation({
    mutationFn: toggleRule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rules'] }),
  })

  const rules = data?.items ?? []

  const filteredRules = searchText.trim()
    ? rules.filter(
        (r) =>
          r.name.toLowerCase().includes(searchText.toLowerCase()) ||
          r.rule_id.toLowerCase().includes(searchText.toLowerCase()) ||
          r.description.toLowerCase().includes(searchText.toLowerCase()),
      )
    : rules

  function openCreateDialog() {
    setEditingRule(null)
    setForm(emptyForm)
    setFormErrors({})
    setSubmitError('')
    setShowDialog(true)
  }

  function openEditDialog(rule: Rule) {
    setEditingRule(rule)
    setForm({
      rule_id: rule.rule_id,
      name: rule.name,
      description: rule.description,
      risk_level: rule.risk_level,
      action: rule.action,
      patterns: rule.patterns.join(', '),
      enabled: rule.enabled,
    })
    setFormErrors({})
    setSubmitError('')
    setShowDialog(true)
  }

  function closeDialog() {
    setShowDialog(false)
    setEditingRule(null)
    setForm(emptyForm)
    setFormErrors({})
    setSubmitError('')
  }

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!form.rule_id.trim()) errors.rule_id = '规则ID不能为空'
    else if (!/^[A-Z_][A-Z0-9_]*$/.test(form.rule_id.trim()))
      errors.rule_id = '规则ID只能包含大写字母、数字和下划线，且以大写字母开头'

    if (!form.name.trim()) errors.name = '规则名称不能为空'
    if (!form.description.trim()) errors.description = '规则说明不能为空'
    if (!form.patterns.trim()) errors.patterns = '匹配模式不能为空'
    else if (form.patterns.split(',').filter((p) => p.trim()).length === 0)
      errors.patterns = '至少需要一个匹配模式'

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  function handleSubmit() {
    if (!validate()) return

    const ruleData: Partial<Rule> = {
      rule_id: form.rule_id.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      risk_level: form.risk_level,
      action: form.action,
      patterns: form.patterns
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
      enabled: form.enabled,
    }

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: ruleData })
    } else {
      createMutation.mutate(ruleData)
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-3">
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">规则中心</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            管理合规审校规则，配置风险检测和处理动作
          </p>
        </div>
        <Button onClick={openCreateDialog} size="sm">
          <Plus className="h-3.5 w-3.5" />
          新建规则
        </Button>
      </div>

      {/* Risk level tabs */}
      <Tabs value={riskFilter} onValueChange={setRiskFilter}>
        <TabsList>
          {RISK_FILTERS.map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className="text-xs">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="搜索规则名称、ID 或描述..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState text="加载规则列表..." />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="h-8 w-8 text-[hsl(var(--critical))] mb-3" />
          <p className="text-sm text-[hsl(var(--critical))]">
            {error instanceof Error ? error.message : '加载失败，请重试'}
          </p>
        </div>
      ) : filteredRules.length === 0 ? (
        <EmptyState
          title="暂无规则"
          description={
            searchText || riskFilter
              ? '没有匹配的规则，请调整筛选条件'
              : '点击"新建规则"创建第一条合规审校规则'
          }
          icon={ShieldCheck}
          action={
            !searchText && !riskFilter ? (
              <Button onClick={openCreateDialog} size="sm">
                <Plus className="h-3.5 w-3.5" />
                新建规则
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-1.5">
          {filteredRules.map((rule) => (
            <Card
              key={rule.id}
              className="transition-colors hover:border-muted-foreground/30"
            >
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Top row: badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {rule.rule_id}
                      </Badge>
                      <RiskBadge level={rule.risk_level} />
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs font-medium',
                          ACTION_COLORS[rule.action] || '',
                        )}
                      >
                        {ACTION_LABELS[rule.action] || rule.action}
                      </Badge>
                      {!rule.enabled && (
                        <Badge variant="secondary" className="text-[10px]">
                          已停用
                        </Badge>
                      )}
                    </div>

                    {/* Name & description */}
                    <h3 className="text-sm font-semibold text-foreground mb-0.5">
                      {rule.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {rule.description}
                    </p>

                    {/* Patterns */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {rule.patterns.map((pattern, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="font-mono text-xs"
                        >
                          {pattern}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => openEditDialog(rule)}
                      title="编辑规则"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => toggleMutation.mutate(rule.id)}
                      disabled={toggleMutation.isPending}
                      title={rule.enabled ? '停用规则' : '启用规则'}
                    >
                      {rule.enabled ? (
                        <ToggleRight className="h-5 w-5 text-[hsl(var(--success))]" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto border-2 border-border bg-white/97 shadow-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-black font-bold">{editingRule ? '编辑规则' : '新建规则'}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {editingRule ? '修改规则配置，保存后立即生效。' : '创建新的合规审校规则，配置风险检测逻辑。'}
            </p>
          </DialogHeader>

          <div className="space-y-3">
            {/* Rule ID */}
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">
                规则 ID <span className="text-[hsl(var(--critical))]">*</span>
              </label>
              <Input
                type="text"
                value={form.rule_id}
                onChange={(e) => setForm({ ...form, rule_id: e.target.value })}
                disabled={!!editingRule}
                placeholder="例如: RULE_DIRECT_RECOMMENDATION"
                className={cn(
                  formErrors.rule_id && 'border-[hsl(var(--critical))]',
                  !!editingRule && 'opacity-50 cursor-not-allowed',
                )}
              />
              {formErrors.rule_id && (
                <p className="mt-0.5 text-[11px] text-[hsl(var(--critical))]">{formErrors.rule_id}</p>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">
                规则名称 <span className="text-[hsl(var(--critical))]">*</span>
              </label>
              <Input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如: 直接荐股表达"
                className={cn(formErrors.name && 'border-[hsl(var(--critical))]')}
              />
              {formErrors.name && (
                <p className="mt-0.5 text-[11px] text-[hsl(var(--critical))]">{formErrors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">
                规则说明 <span className="text-[hsl(var(--critical))]">*</span>
              </label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="描述此规则的检测目的和匹配逻辑..."
                rows={2}
                className={cn('resize-none text-sm', formErrors.description && 'border-[hsl(var(--critical))]')}
              />
              {formErrors.description && (
                <p className="mt-0.5 text-[11px] text-[hsl(var(--critical))]">
                  {formErrors.description}
                </p>
              )}
            </div>

            {/* Risk level + Action row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1">
                  风险等级
                </label>
                <Select
                  value={form.risk_level}
                  onValueChange={(value) =>
                    setForm({ ...form, risk_level: (value as RiskLevel) || 'MEDIUM' })
                  }
                >
                  <SelectTrigger className="bg-white w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-400">
                    {RISK_LEVELS.map((lvl) => (
                      <SelectItem key={lvl} value={lvl}>
                        {lvl === 'LOW'
                          ? '低风险'
                          : lvl === 'MEDIUM'
                            ? '中风险'
                            : lvl === 'HIGH'
                              ? '高风险'
                              : '严重风险'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1">
                  处理动作
                </label>
                <Select
                  value={form.action}
                  onValueChange={(value) => setForm({ ...form, action: value || 'MANUAL_REVIEW' })}
                >
                  <SelectTrigger className="bg-white w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-400">
                    {ACTIONS.map((act) => (
                      <SelectItem key={act} value={act}>
                        {ACTION_LABELS[act]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Patterns */}
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">
                匹配模式 <span className="text-[hsl(var(--critical))]">*</span>
              </label>
              <Input
                type="text"
                value={form.patterns}
                onChange={(e) => setForm({ ...form, patterns: e.target.value })}
                placeholder="多个模式用逗号分隔，例如: 建议买入, 重点配置, 立即建仓"
                className={cn(formErrors.patterns && 'border-[hsl(var(--critical))]')}
              />
              {formErrors.patterns && (
                <p className="mt-0.5 text-[11px] text-[hsl(var(--critical))]">{formErrors.patterns}</p>
              )}
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                使用逗号分隔多个匹配关键字或短语
              </p>
            </div>

            {/* Enabled toggle */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-foreground/80">启用状态</label>
              <Toggle
                variant="outline"
                pressed={form.enabled}
                onPressedChange={(pressed) => setForm({ ...form, enabled: pressed })}
                size="sm"
              >
                {form.enabled ? (
                  <ToggleRight className="h-4 w-4 text-[hsl(var(--success))]" />
                ) : (
                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                )}
              </Toggle>
              <span className="text-[11px] text-muted-foreground">
                {form.enabled ? '已启用' : '已停用'}
              </span>
            </div>

            {/* Submit error */}
            {submitError && (
              <div className="rounded-md border border-[hsl(var(--critical))/0.3] bg-[hsl(var(--critical))/0.06] px-3 py-2">
                <p className="text-xs text-[hsl(var(--critical))]">{submitError}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeDialog} size="sm">
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} size="sm" className="bg-[hsl(110,12%,52%)] hover:bg-[hsl(110,12%,48%)] text-white">
              {isSubmitting ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  保存规则
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
