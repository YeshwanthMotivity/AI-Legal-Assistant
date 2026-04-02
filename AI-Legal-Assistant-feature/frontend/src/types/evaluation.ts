// Evaluation module TypeScript types — T8

export interface TimeSeriesPoint {
  bucket: string    // ISO-8601 datetime
  value: number
}

export interface MetricsTimeSeries {
  metric_type: string
  phase: string
  data: TimeSeriesPoint[]
  current_avg: number
}

export interface MetricsResponse {
  // Phase 2 — retrieval
  precision_at_5: number
  recall_at_5: number
  mrr: number

  // Phase 3 — case similarity
  top_5_accuracy: number
  avg_similarity_score: number

  // Phase 4 — graph (kept for backward compat)
  graph_confidence: number

  // Phase 1 — entity extraction
  entity_extraction_accuracy: number
  entity_extraction_by_type: Record<string, number>

  // Phase 5 — AI / judge feedback
  outcome_agreement: number
  judge_score: number
  search_latency: number
  ai_latency: number

  // Time-series for all metrics
  time_series: MetricsTimeSeries[]
}

export interface BenchmarkRunResult {
  run_id: string
  run_at: string   // ISO-8601
  mode: string
  precision_at_5: number
  recall_at_5: number
  mrr: number
  query_count: number
}

export interface ReleaseGate {
  id: string
  phase: string
  mode: string
  status: 'pending' | 'approved' | 'deferred'
  rationale: string | null
  judge_sign_off: string | null
  decided_at: string | null
  benchmark_run_id: string | null
  created_at: string
}

export interface ReleaseGateRequest {
  phase: string
  mode: string
  status: 'approved' | 'deferred'
  rationale: string
  judge_sign_off: string
  benchmark_run_id?: string
}

export interface JudgeFeedbackCreate {
  judgment_id: string
  legal_relevance_score: number   // 1–5
  reasoning_quality_score: number // 1–5
  explanation_clarity_score: number // 1–5
  feedback_text?: string
  suggested_improvements?: string
}
