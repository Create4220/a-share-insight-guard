// Risk levels
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

// Review status
export type ReviewStatus =
  | 'APPROVED'
  | 'NEEDS_REVISION'
  | 'NEEDS_MANUAL_REVIEW'
  | 'BLOCKED'

// Claim type
export type ClaimType =
  | 'FACT'
  | 'OPINION'
  | 'FORECAST'
  | 'GUIDANCE'
  | 'RISK_DISCLOSURE'

// Evidence credibility
export type CredibilityLevel = 'A' | 'B' | 'C' | 'D'

// Review action
export type ReviewAction = 'APPROVE' | 'REJECT' | 'BLOCK' | 'REQUEST_EVIDENCE'

// API response wrapper
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
  }
}

// Dashboard
export interface DashboardSummary {
  total_analyses_today: number
  high_risk_count: number
  pending_review_count: number
  approved_count: number
  avg_compliance_score: number
}

export interface RiskTrendPoint {
  date: string
  total: number
  high_risk: number
  critical: number
}

export interface RiskDistribution {
  category: string
  count: number
}

export interface PendingTask {
  id: string
  task_number: string
  title: string
  security_code: string
  risk_level: RiskLevel
  status: ReviewStatus
  created_at: string
}

// Analysis
export interface RiskHit {
  rule_id: string
  rule_name: string
  risk_level: RiskLevel
  action: string
  matched_text: string
  matched_pattern: string
}

export interface Claim {
  id: string
  text: string
  claim_type: ClaimType
  has_evidence: boolean
  confidence: number
}

export interface Evidence {
  id: string
  source_name: string
  source_url: string
  credibility: CredibilityLevel
  summary: string
  is_demo: boolean
}

export interface RevisionSuggestion {
  original_text: string
  suggested_text: string
  reason: string
}

export interface AnalysisResult {
  id: string
  title?: string
  original_text: string
  compliance_score: number
  status: ReviewStatus
  risk_level: RiskLevel
  risk_hits: RiskHit[]
  claims: Claim[]
  evidence: Evidence[]
  revision_suggestions: RevisionSuggestion[]
  missing_risk_disclosure: boolean
  missing_evidence: boolean
  review_task_id?: string | null
  review_task_number?: string | null
  created_at: string
}

export interface AnalysisRequest {
  content: string
  security_code?: string
}

// Review task
export interface ReviewTask {
  id: string
  task_number: string
  title: string
  security_code: string
  compliance_score: number
  risk_level: RiskLevel
  status: ReviewStatus
  reviewer: string
  created_at: string
}

export interface ReviewDecision {
  action: ReviewAction
  comment: string
}

// Rule
export interface Rule {
  id: string
  rule_id: string
  name: string
  description: string
  risk_level: RiskLevel
  action: string
  patterns: string[]
  enabled: boolean
  created_at: string
  updated_at: string
}

// Audit log
export interface AuditLog {
  id: string
  timestamp: string
  operator: string
  action: string
  entity_type: string
  entity_id: string
  old_status?: string
  new_status?: string
  comment?: string
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
