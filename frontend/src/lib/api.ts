const API_BASE = '/api/v1'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Network error' } }))
    throw new Error(err.error?.message || `HTTP ${res.status}`)
  }
  const json = await res.json()
  if (!json.success) {
    throw new Error(json.error?.message || 'Request failed')
  }
  return json.data
}

// Dashboard
export const fetchDashboardSummary = () =>
  request<import('../types').DashboardSummary>('/dashboard/summary')

export const fetchRiskTrend = () =>
  request<import('../types').RiskTrendPoint[]>('/dashboard/risk-trend')

export const fetchRiskDistribution = () =>
  request<import('../types').RiskDistribution[]>('/dashboard/risk-distribution')

export const fetchPendingTasks = () =>
  request<import('../types').PendingTask[]>('/dashboard/pending-tasks')

// Analysis
export const submitAnalysis = (data: import('../types').AnalysisRequest) =>
  request<import('../types').AnalysisResult>('/analyses/review', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const fetchAnalyses = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return request<import('../types').PaginatedResponse<import('../types').AnalysisResult>>(`/analyses${qs}`)
}

export const fetchAnalysis = (id: string) =>
  request<import('../types').AnalysisResult>(`/analyses/${id}`)

export const submitForReview = (id: string) =>
  request<import('../types').ReviewTask>(`/analyses/${id}/submit-review`, {
    method: 'POST',
  })

// Review tasks
export const fetchReviewTasks = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return request<import('../types').PaginatedResponse<import('../types').ReviewTask>>(`/review-tasks${qs}`)
}

export const fetchReviewTask = (id: string) =>
  request<import('../types').ReviewTask>(`/review-tasks/${id}`)

export const submitDecision = (taskId: string, data: import('../types').ReviewDecision) =>
  request<{ task: import('../types').ReviewTask; audit_log: import('../types').AuditLog }>(
    `/review-tasks/${taskId}/decision`,
    { method: 'POST', body: JSON.stringify(data) },
  )

// Audit logs
export const fetchAuditLogs = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return request<import('../types').PaginatedResponse<import('../types').AuditLog>>(`/audit-logs${qs}`)
}

// Rules
export const fetchRules = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return request<import('../types').PaginatedResponse<import('../types').Rule>>(`/rules${qs}`)
}

export const createRule = (data: Partial<import('../types').Rule>) =>
  request<import('../types').Rule>('/rules', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateRule = (ruleId: string, data: Partial<import('../types').Rule>) =>
  request<import('../types').Rule>(`/rules/${ruleId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const toggleRule = (ruleId: string) =>
  request<import('../types').Rule>(`/rules/${ruleId}/toggle`, { method: 'POST' })

// Risk level adjustment
export const updateRiskLevel = (analysisId: string, data: { risk_level: string; status: string; comment?: string }) =>
  request<{ id: string; risk_level: string; status: string }>(`/analyses/${analysisId}/risk-level`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

// Audit log comment update
export const updateAuditLog = (logId: string, data: { comment: string }) =>
  request<{ id: string; comment: string }>(`/audit-logs/${logId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

// Revoke audit log
export const revokeAuditLog = (logId: string) =>
  request<{ id: string; revoked: boolean; reverse_note: string }>(`/audit-logs/${logId}/revoke`, {
    method: 'POST',
  })
