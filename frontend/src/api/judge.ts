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
    if (row.title || row.content || row.description || row.article_text || row.body) {
      return {
        title: String(row.title ?? row.law_name ?? row.article_number ?? 'Legal Article'),
        content: String(row.content ?? row.text ?? row.description ?? row.article_text ?? row.body ?? row.summary ?? 'Citations mapped from primary case analysis.'),
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
  // Remove full JSON objects that might be prefixed
  const patterns = [
    /^\{[\s\S]*"case_id"\s*:[^}]*\}/, 
    /^\{[\s\S]*"context"\s*:[^}]*\}/,
    /^AI Draft:\s*$/i,
    /Source Context:[\s\S]*?Analysis:/i
  ]
  const hasContextBlob = patterns.some((p) => p.test(content)) || content.includes('"context":')
  
  if (hasContextBlob) {
    const marker = 'Preliminary legal analysis'
    const markerIndex = content.indexOf(marker)
    if (markerIndex >= 0) {
      cleanContent = content.slice(markerIndex).trim()
    } else {
      // Remove any top-level JSON structure
      cleanContent = content.replace(/^\{[\s\S]*?\}\s*/g, '').trim()
    }
  }

  // Normalize bullets & clean whitespace
  const normalized = cleanContent
    .replace(/•\s*/g, '\n• ')
    .replace(/\n{3,}/g, '\n\n')

  // Convert plain text to structured HTML for Quill
  const lines = normalized.split('\n')
  const htmlLines = lines.map(line => {
    const trimmed = line.trim()
    if (!trimmed) return '<p><br></p>'
    
    // Numbered section headers like "1. DISPOSITION AND OUTCOME"
    if (/^\d+\.\s+[A-Z\s,]+$/.test(trimmed)) {
      return `<h3 style="margin-top: 20px; margin-bottom: 8px; border-bottom: 2px solid #f1f5f9; padding-bottom: 4px;"><strong>${trimmed}</strong></h3>`
    }
    
    // Bullet points or key-value highlights
    if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      // Highlight potential case slugs in monospace
      const highlighted = trimmed.replace(/([a-z0-9]+-(?:case|eng)[a-z0-09-]*)/gi, '<code style="background: #f1f5f9; padding: 1px 4px; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: #475569;">$1</code>')
      return `<p style="margin-bottom: 4px;">${highlighted}</p>`
    }
    
    // Bold key-value lines like "Employee Name: Ahmed"
    if (trimmed.includes(':') && trimmed.split(':')[0].length < 40) {
      const [key, ...rest] = trimmed.split(':')
      return `<p style="margin-bottom: 4px;"><strong>${key}:</strong>${rest.join(':')}</p>`
    }
    
    return `<p style="margin-bottom: 4px;">${trimmed}</p>`
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

  const reasoningText = typeof analysis.reasoning === 'string' 
    ? analysis.reasoning 
    : String(reasoning.reasoning ?? '')

  // Derive summary from first 2 sentences of reasoning
  const summarySentences = reasoningText.split('. ').slice(0, 2).join('. ') + (reasoningText.includes('. ') ? '.' : '')

  return {
    case_id: raw.case_id,
    analysis: {
      status: String(analysis.status ?? 'not_found'),
      outcome: analysis.outcome,
      summary: summarySentences || undefined,
      facts: reasoningText 
        ? reasoningText.split('. ').filter(s => s.length > 20).slice(0, 5)
        : [],
      reasoning: reasoningText,
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
  try {
    const response = await apiClient.get<CaseListResponse>('/cases', { params })
    const items = Array.isArray(response.data.items) ? response.data.items : []
    
    // Inject a dummy case for demonstration
    const dummy: CaseResponse = {
      id: 'dummy-case-2024-9d03',
      case_number: 'CASE-20240402-9D03BD3A',
      title: 'Mohamed Khaled Hassan vs Al Safa Engineering LLC',
      status: 'AIAnalysisReady' as any,
      claimant_name: 'Mohamed Khaled Hassan',
      respondent_name: 'Al Safa Engineering LLC',
      hearing_date: '2024-04-10T09:00:00Z',
      case_type: 'WRONGFUL_TERMINATION' as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    return {
      total: (response.data.total ?? 0) + 1,
      items: [dummy, ...items],
    }
  } catch (error) {
    // If backend is down, still return the dummy case
    return {
      total: 1,
      items: [{
        id: 'dummy-case-2024-9d03',
        case_number: 'CASE-20240402-9D03BD3A',
        title: 'Mohamed Khaled Hassan vs Al Safa Engineering LLC',
        status: 'AIAnalysisReady' as any,
        claimant_name: 'Mohamed Khaled Hassan',
        respondent_name: 'Al Safa Engineering LLC',
        hearing_date: '2024-04-10T09:00:00Z',
        case_type: 'WRONGFUL_TERMINATION' as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]
    }
  }
}


export const createCase = async (payload: CreateCaseRequest): Promise<CaseResponse> => {
  const response = await apiClient.post<CaseResponse>('/cases', payload)
  return response.data
}

export const getCase = async (caseId: string): Promise<CaseResponse> => {
  if (caseId === 'dummy-case-2024-9d03') {
    return {
      id: 'dummy-case-2024-9d03',
      case_number: 'CASE-20240402-9D03BD3A',
      title: 'Mohamed Khaled Hassan vs Al Safa Engineering LLC',
      status: 'AIAnalysisReady' as any,
      claimant_name: 'Mohamed Khaled Hassan',
      respondent_name: 'Al Safa Engineering LLC',
      hearing_date: '2024-04-10T09:00:00Z',
      case_type: 'WRONGFUL_TERMINATION' as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
  const response = await apiClient.get<CaseResponse>(`/cases/${caseId}`)
  return response.data
}

export const deleteCase = async (caseId: string): Promise<void> => {
  await apiClient.delete(`/cases/${caseId}`)
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
  if (caseId === 'dummy-case-2024-9d03') {
    return {
      total: 3,
      items: [
        { id: 'doc-1', file_name: 'employment_contract_khaled.pdf', document_type: 'employment_contract', created_at: new Date().toISOString(), processing_status: 'Ready' },
        { id: 'doc-2', file_name: 'termination_notice_march.pdf', document_type: 'termination_notice', created_at: new Date().toISOString(), processing_status: 'Ready' },
        { id: 'doc-3', file_name: 'salary_records_2023.pdf', document_type: 'salary_records', created_at: new Date().toISOString(), processing_status: 'Ready' }
      ] as any
    }
  }
  const response = await apiClient.get<DocumentListResponse>(`/cases/${caseId}/documents`)
  return {
    total: response.data.total ?? 0,
    items: toArray(response.data.items) as DocumentResponse[],
  }
}

export const runAnalysis = async (caseId: string): Promise<{ case_id: string; status: string }> => {
  if (caseId === 'dummy-case-2024-9d03') {
    return { case_id: caseId, status: 'AIAnalysisPending' }
  }
  const response = await apiClient.post<{ case_id: string; status: string }>(`/cases/${caseId}/analyze`)
  return response.data
}

export const getAnalysis = async (caseId: string): Promise<CaseAnalysisResponse> => {
  if (caseId === 'dummy-case-2024-9d03') {
    return {
      case_id: caseId,
      analysis: {
        status: 'AIAnalysisReady',
        outcome: 'Breach of Article 144 detected',
        summary: 'The claimant was terminated without fulfilling the 30-day notice period as stipulated in the employment contract dated Jan 2023.',
        facts: [
          'Claimant joined Al Safa Engineering on 2023-01-15.',
          'Termination occurred on 2024-03-20 via email.',
          'No prior disciplinary warnings were provided.',
          'Final salary for March was only partially paid.',
          'Notice period was not served or compensated.'
        ],
        reasoning: 'Under UAE Labor Law Article 144, wrongful termination occurs when the employer fails to provide valid grounds or notice. The contract provided for a 30-day notice period which was admittedly ignored. Entitlements follow statutory minimums for arbitrary dismissal.',
        lawArticles: [
          { title: 'Article 144 - Notice Period', content: 'Notice period must be at least 30 days and no more than 90 days for both parties.' },
          { title: 'Article 146 - Wrongful Termination', content: 'Compensation for wrongful termination can be up to 3 months of salary.' },
          { title: 'End-of-service Gratuity', content: 'Calculated based on 21 days for each year of service for the first 5 years.' }
        ],
        similarPrecedents: [
          { caseId: 'DIFC-2022-04', title: 'Omar vs. TechHub Solu', similarityScore: 0.94, summary: 'A similar breach where notice was waived by the employer without compensation.' },
          { caseId: 'DIFC-2021-12', title: 'Saeed vs. Vision Corp', similarityScore: 0.88, summary: 'Settlement for arbitrary dismissal where no disciplinary record existed.' }
        ],
        entitlementBreakdown: [
          { label: 'Unpaid Wages (March)', value: 'AED 12,000' },
          { label: 'Notice Period Pay', value: 'AED 18,500' },
          { label: 'Arbitrary Dismissal (2 Mo)', value: 'AED 37,000' },
          { label: 'EOSG (1.2 Years)', value: 'AED 8,600' }
        ],
        confidence: 94,
        draftText: '<h1>REASONED JUDICIAL DETERMINATION</h1><p><strong>Claimant:</strong> Mohamed Khaled Hassan</p><p><strong>Respondent:</strong> Al Safa Engineering LLC</p><h3>1. FINDINGS OF FACT</h3><p>The court finds that the claimant was employed from Jan 15, 2023, until March 20, 2024. The respondent terminated the relationship with immediate effect without compensation in lieu of notice.</p><h3>2. LEGAL REASONING</h3><p>Pursuant to Article 144, the contract remains valid during the notice period. Failure to provide such notice entitles the employee to full wages for that period. Further, no disciplinary cause was proven, making the dismissal arbitrary under Article 146.</p><h3>3. DISPOSITION</h3><p>The respondent is ordered to pay the claimant the sum of AED 76,100 within 14 days.</p>',
        explainability: {}
      }
    }
  }
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

export const getPrecedent = async (
  precedentId: string,
  language: string = 'en'
): Promise<PrecedentDetail> => {
  const response = await apiClient.get<PrecedentDetail>(
    `/precedents/${precedentId}`,
    { params: { language } }
  )
  return response.data
}

export const chatWithPrecedent = async (
  precedentId: string,
  message: string,
  language: string = 'en'
): Promise<PrecedentChatResponse> => {
  const response = await apiClient.post<PrecedentChatResponse>(
    `/precedents/${precedentId}/chat`,
    { message, language }
  )
  return response.data
}
