export type CaseStatus =
  | 'Created'
  | 'DocumentsUploaded'
  | 'AIAnalysisPending'
  | 'AIAnalysisReady'
  | 'DraftGenerated'
  | 'CaseClosed'

export type CaseType =
  | 'unpaid_wages'
  | 'wrongful_termination'
  | 'end_of_service'
  | 'contract_dispute'
  | 'other'

export type DocumentType =
  | 'contract'
  | 'financial_record'
  | 'termination_notice'
  | 'witness_statement'
  | 'employment_contract'
  | 'salary_records'
  | 'termination_letter'
  | 'evidence'
  | 'court_order'
  | 'other'

export interface CaseResponse {
  id: string
  case_number: string
  title: string
  description?: string | null
  case_type: CaseType
  status: CaseStatus
  assigned_to?: string | null
  created_by?: string | null
  claimant_name?: string | null
  respondent_name?: string | null
  claim_amount?: string | null
  filing_date?: string | null
  hearing_date?: string | null
  judgment_date?: string | null
  court_number?: string | null
  notes?: string | null
  judgment_text?: string | null
  ai_precision_score?: number | null
  created_at: string
  updated_at?: string
}

export interface CaseListResponse {
  total: number
  items: CaseResponse[]
}

export interface SimilarPrecedent {
  caseId: string
  title: string
  similarityScore: number
  summary?: string | null
  claimant?: string | null
  respondent?: string | null
}

export interface EntitlementItem {
  label: string
  value: string
}

export interface LawArticle {
  title: string
  content: string
}

export interface NormalizedCaseAnalysis {
  status: string
  summary?: string
  outcome?: string
  reasoning?: string
  lawArticles: (string | LawArticle)[]
  similarPrecedents: SimilarPrecedent[]
  entitlementBreakdown: EntitlementItem[]
  confidence: number
  draftText: string
  explainability: Record<string, unknown>
  reasoning_status?: string
  facts?: string[]
}

export interface CaseAnalysisResponse {
  case_id: string
  analysis: NormalizedCaseAnalysis
}

export interface DocumentResponse {
  id: string
  case_id: string
  document_type: DocumentType
  file_name: string
  file_path?: string | null
  file_size?: string | null
  mime_type?: string | null
  storage_key?: string | null
  processing_status: string
  uploaded_by?: string | null
  ocr_text?: string | null
  doc_metadata?: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface DocumentListResponse {
  total: number
  items: DocumentResponse[]
}

export interface CreateCaseRequest {
  title: string
  case_type: CaseType
  claimant_name: string
  respondent_name: string
  description: string
  claim_amount: string
  filing_date: string
  notes?: string
}

export interface JudgmentRequest {
  judgment_text: string
  decision: string
  compensation_amount?: string
  reasoning?: string
  legal_precedents?: string[]
  articles_cited?: string[]
}

export interface FeedbackRequest {
  legal_relevance_score: number
  reasoning_quality_score: number
  explanation_clarity_score: number
  feedback_text?: string
  suggested_improvements?: string
}

export interface PrecedentDetail {
  id: string
  title: string
  year?: string
  category?: string
  text: string
  outcome?: string
  case_type?: string
  summary?: string | null
  cited_laws?: string[]
  compensation?: string
  claimant?: string | null
  respondent?: string | null
}

export interface PrecedentChatResponse {
  response: string
}
