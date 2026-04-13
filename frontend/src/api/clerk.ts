import type { AxiosProgressEvent } from 'axios'
import apiClient from './client'
import type { CaseListResponse, CaseResponse, DocumentListResponse, DocumentResponse, DocumentType } from '../types/judge'
import type { ClerkCreateCaseRequest, ClerkUpdateCaseMetadataRequest } from '../types/clerk'
import type { AdminUser } from '../types/admin'

export const clerkGetJudges = async () => {
  const response = await apiClient.get<AdminUser[]>('/auth/judges')
  return response.data
}

export const clerkGetCases = async (params: { skip?: number; limit?: number; status?: string } = {}) => {
  const response = await apiClient.get<CaseListResponse>('/cases', { params })
  return response.data
}

export const clerkCreateCase = async (payload: ClerkCreateCaseRequest) => {
  const response = await apiClient.post<CaseResponse>('/cases', payload)
  return response.data
}

export const clerkUpdateCaseMetadata = async (caseId: string, payload: ClerkUpdateCaseMetadataRequest) => {
  const response = await apiClient.patch<CaseResponse>(`/cases/${caseId}`, payload)
  return response.data
}

export const clerkAssignCase = async (caseId: string, assignedTo: string) => {
  const response = await apiClient.patch<CaseResponse>(`/cases/${caseId}/assign`, { assigned_to: assignedTo })
  return response.data
}

export const clerkGetCaseDocuments = async (caseId: string) => {
  const response = await apiClient.get<DocumentListResponse>(`/cases/${caseId}/documents`)
  return response.data
}

export const clerkUploadDocument = async (
  caseId: string,
  file: File,
  documentType: DocumentType,
  onProgress?: (progress: number) => void
) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('document_type', documentType)

  const response = await apiClient.post<DocumentResponse>(`/cases/${caseId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (!event.total || !onProgress) return
      const progress = Math.round((event.loaded / event.total) * 100)
      onProgress(progress)
    },
  })
  return response.data
}
export const clerkGetCase = async (caseId: string) => {
  const response = await apiClient.get<CaseResponse>(`/cases/${caseId}`)
  return response.data
}

export const clerkDeleteCaseDocument = async (caseId: string, documentId: string) => {
  const response = await apiClient.delete(`/cases/${caseId}/documents/${documentId}`)
  return response.data
}

export const clerkDeleteCase = async (caseId: string) => {
  const response = await apiClient.delete(`/cases/${caseId}`)
  return response.data
}

export const clerkRunAnalysis = async (caseId: string, language: string = 'en') => {
  const response = await apiClient.post(`/cases/${caseId}/analyze`, { language })
  return response.data
}

export const clerkGetDocumentContent = async (caseId: string, documentId: string) => {
  const response = await apiClient.get(`/cases/${caseId}/documents/${documentId}/content`, {
    responseType: 'blob'
  })
  return response.data
}

export const clerkGetAuditLogs = async (caseId: string) => {
  const response = await apiClient.get<any[]>(`/audit?case_id=${caseId}`)
  return response.data
}
