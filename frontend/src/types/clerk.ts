import type { CaseResponse, CaseType, DocumentType } from './judge'

export interface ClerkCreateCaseRequest {
  title: string
  case_type: CaseType
  claimant_name: string
  respondent_name: string
  filing_date: string
  court_number?: string
  description?: string
  claim_amount?: string
  assigned_to?: string
}

export interface ClerkUpdateCaseMetadataRequest {
  hearing_date?: string
  status?: string
}

export interface ClerkUploadJob {
  id: string
  file: File
  documentType: DocumentType
  progress: number
  status: 'queued' | 'uploading' | 'success' | 'failed'
  error?: string
}

export type ClerkCase = CaseResponse

