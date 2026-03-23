import apiClient from './client'
import type {
  CaseAnalysisResponse,
  CaseListResponse,
  CaseResponse,
  CreateCaseRequest,
  DocumentListResponse,
  DocumentResponse,
  EntitlementItem,
  FeedbackRequest,
  JudgmentRequest,
  LawArticle,
  PrecedentChatResponse,
  PrecedentDetail,
  SimilarPrecedent,
} from '../types/judge'

interface GetJudgeCasesParams {
  skip?: number
  limit?: number
  status?: string
}

interface RawCaseAnalysis {
  status?: string
  outcome?: string
  reasoning?: Record<string, unknown> | string | null
  cited_laws?: unknown
  cited_cases?: unknown
  confidence?: number | string | null
  draft_text?: string | null
  explainability?: Record<string, unknown> | null
}

interface RawCaseAnalysisResponse {
  case_id: string
  analysis?: RawCaseAnalysis
}

const toArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  return []
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item)).filter(Boolean)
}

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number(value)
  if (Number.isFinite(parsed)) return parsed
  return fallback
}

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

const extractSimilarPrecedents = (
  explainability: Record<string, unknown>,
  fallbackCases: unknown
): SimilarPrecedent[] => {
  const candidates = [
    explainability.similar_precedents,
    explainability.similar_cases,
    explainability.precedents,
    explainability.top_matches,
    explainability.sources,
    fallbackCases,
  ]

  const source = candidates.find((candidate) => Array.isArray(candidate))
  if (!source || !Array.isArray(source)) return []

  return source.slice(0, 5).map((item, index) => {
    if (typeof item === 'string') {
      return {
        caseId: `precedent-${index + 1}`,
        title: item,
        similarityScore: 0,
      }
    }
    const row = asRecord(item)
    const title =
      String(row.title ?? row.case_title ?? row.summary ?? row.name ?? `Precedent ${index + 1}`)
    const caseId = String(row.case_id ?? row.id ?? `precedent-${index + 1}`)
    const similarityScore = toNumber(row.similarity ?? row.score ?? row.similarity_score, 0)
    const summary = row.summary ? String(row.summary) : undefined
    return { caseId, title, similarityScore, summary }
  })
}

const extractLawArticles = (
  explainability: Record<string, unknown>,
  citedLaws: unknown
): (string | LawArticle)[] => {
  const preferred = [
    explainability.law_articles,
    explainability.cited_law_articles,
    explainability.recommended_articles,
    explainability.cited_laws,
    citedLaws,
  ]

  const firstArray = preferred.find(Array.isArray) as unknown[] | undefined
  if (!firstArray) return []

  return firstArray.map((entry) => {
    if (typeof entry === 'string') return entry
    const row = asRecord(entry)
    if (row.title || row.content) {
      return {
        title: String(row.title ?? row.law_name ?? row.article_number ?? 'Legal Article'),
        content: String(row.content ?? row.text ?? row.summary ?? 'Citations mapped from primary case analysis.'),
      }
    }
    return String(row.article ?? row.id ?? '').trim()
  }).filter(Boolean) as (string | LawArticle)[]
}

const extractEntitlements = (explainability: Record<string, unknown>): EntitlementItem[] => {
  const raw =
    explainability.entitlement_calculation ??
    explainability.calculations ??
    explainability.entitlement_breakdown

  if (Array.isArray(raw)) {
    return raw.map((item, index) => {
      const row = asRecord(item)
      const label = String(row.label ?? row.item ?? row.name ?? `Item ${index + 1}`)
      const value = String(row.value ?? row.amount ?? row.total ?? '-')
      return { label, value }
    })
  }

  const record = asRecord(raw)
  if (Object.keys(record).length > 0) {
    return Object.entries(record).map(([label, value]) => ({
      label,
      value: typeof value === 'string' ? value : JSON.stringify(value),
    }))
  }

  return []
}

const sanitizeDraftText = (value: string): string => {
  const content = value.trim()
  if (!content) return ''

  let cleanContent = content
  const patterns = [/^\{[\s\S]*"case_id"\s*:/, /^AI Draft:\s*$/i]
  const hasContextBlob = patterns.some((pattern) => pattern.test(content)) || content.includes('"context"')
  
  if (hasContextBlob) {
    const marker = 'Preliminary legal analysis'
    const markerIndex = content.indexOf(marker)
    if (markerIndex >= 0) {
      cleanContent = content.slice(markerIndex).trim()
    } else {
      cleanContent = content.replace(/\{[\s\S]*?\}\s*/g, '').trim()
    }
  }

  // Convert plain text to structured HTML for Quill
  const lines = cleanContent.split('\n')
  const htmlLines = lines.map(line => {
    const trimmed = line.trim()
    if (!trimmed) return '<p><br></p>'
    // Numbered section headers like "1. DISPOSITION AND OUTCOME"
    if (/^\d+\.\s+[A-Z\s,]+$/.test(trimmed)) {
      return `<h3><strong>${trimmed}</strong></h3>`
    }
    // Bullet points
    if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      return `<p>${trimmed}</p>`
    }
    // Bold key-value lines like "Employee Name: Ahmed"
    if (trimmed.includes(':') && trimmed.split(':')[0].length < 40) {
      const [key, ...rest] = trimmed.split(':')
      return `<p><strong>${key}:</strong>${rest.join(':')}</p>`
    }
    return `<p>${trimmed}</p>`
  })
  return htmlLines.join('')
}

const normalizeCaseAnalysis = (raw: RawCaseAnalysisResponse): CaseAnalysisResponse => {
  const analysis = raw.analysis ?? {}
  const explainability = asRecord(analysis.explainability)
  const reasoning = asRecord(analysis.reasoning)
  const confidenceRaw = toNumber(analysis.confidence, 0)
  const confidence = confidenceRaw <= 1 ? confidenceRaw * 100 : confidenceRaw
  const draftSource = String(analysis.draft_text ?? reasoning.draft_judgment ?? '')

  return {
    case_id: raw.case_id,
    analysis: {
      status: String(analysis.status ?? 'not_found'),
      outcome: analysis.outcome,
      reasoning: typeof analysis.reasoning === 'string' ? analysis.reasoning : String(reasoning.reasoning ?? ''),
      lawArticles: extractLawArticles(explainability, analysis.cited_laws ?? reasoning.cited_laws),
      similarPrecedents: extractSimilarPrecedents(explainability, analysis.cited_cases ?? reasoning.cited_cases),
      entitlementBreakdown: extractEntitlements(explainability),
      confidence: confidence || toNumber(reasoning.confidence, 0),
      draftText: sanitizeDraftText(draftSource),
      explainability,
    },
  }
}

export const getJudgeCases = async (params: GetJudgeCasesParams = {}): Promise<CaseListResponse> => {
  const response = await apiClient.get<CaseListResponse>('/cases', { params })
  return {
    total: response.data.total ?? 0,
    items: Array.isArray(response.data.items) ? response.data.items : [],
  }
}

export const createCase = async (payload: CreateCaseRequest): Promise<CaseResponse> => {
  const response = await apiClient.post<CaseResponse>('/cases', payload)
  return response.data
}

export const getCase = async (caseId: string): Promise<CaseResponse> => {
  const response = await apiClient.get<CaseResponse>(`/cases/${caseId}`)
  return response.data
}

export const uploadCaseDocument = async (
  caseId: string,
  file: File,
  documentType: string
): Promise<DocumentResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('document_type', documentType)

  const response = await apiClient.post<DocumentResponse>(`/cases/${caseId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const getCaseDocuments = async (caseId: string): Promise<DocumentListResponse> => {
  const response = await apiClient.get<DocumentListResponse>(`/cases/${caseId}/documents`)
  return {
    total: response.data.total ?? 0,
    items: toArray(response.data.items) as DocumentResponse[],
  }
}

export const runAnalysis = async (caseId: string): Promise<{ case_id: string; status: string }> => {
  const response = await apiClient.post<{ case_id: string; status: string }>(`/cases/${caseId}/analyze`)
  return response.data
}

export const getAnalysis = async (caseId: string): Promise<CaseAnalysisResponse> => {
  const response = await apiClient.get<RawCaseAnalysisResponse>(`/cases/${caseId}/analysis`)
  return normalizeCaseAnalysis(response.data)
}

export const saveJudgment = async (caseId: string, payload: JudgmentRequest) => {
  const response = await apiClient.post(`/cases/${caseId}/judgment`, payload)
  return response.data
}

export const submitFeedback = async (caseId: string, payload: FeedbackRequest) => {
  const response = await apiClient.post(`/cases/${caseId}/feedback`, payload)
  return response.data
}

export const getPrecedent = async (precedentId: string): Promise<PrecedentDetail> => {
  const response = await apiClient.get<PrecedentDetail>(`/precedents/${precedentId}`)
  return response.data
}

export const chatWithPrecedent = async (
  precedentId: string,
  message: string
): Promise<PrecedentChatResponse> => {
  const response = await apiClient.post<PrecedentChatResponse>(`/precedents/${precedentId}/chat`, {
    message,
  })
  return response.data
}
