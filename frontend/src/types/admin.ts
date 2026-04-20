import type { CaseResponse } from './judge'

export interface AdminUser {
  id: string
  email: string
  username: string
  full_name?: string | null
  role: 'admin' | 'judge' | 'clerk'
  is_active: string
  created_at: string
  updated_at: string
}

export interface AdminCreateUserRequest {
  email: string
  username: string
  full_name?: string
  role: 'admin' | 'judge' | 'clerk'
  password?: string
}

export interface AdminAuditLogItem {
  id: string
  user_id?: string | null
  action: string
  resource_type?: string | null
  resource_id?: string | null
  description?: string | null
  created_at: string
}

export interface AdminAuditLogResponse {
  total: number
  items: AdminAuditLogItem[]
}

export interface AdminMetricsResponse {
  precision_at_5: number
  recall_at_5: number
  mrr: number
  top_5_accuracy: number
  avg_similarity_score: number
  graph_confidence: number
  entity_extraction_accuracy: number
  entity_extraction_by_type: Record<string, number>
  outcome_agreement: number
  judge_score: number
  search_latency: number
  ai_latency: number
  time_series: import('./evaluation').MetricsTimeSeries[]
}

export interface AdminStatsOverview {
  totalCases: number
  activeJudges: number
  documentsProcessed: number
  judgmentsFinalized: number
}

export type AdminCase = CaseResponse

