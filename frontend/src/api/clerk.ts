import apiClient from './client'
import type { ClerkCreateCaseRequest, ClerkUpdateCaseMetadataRequest } from '../types/clerk'
import type { CaseListResponse, CaseResponse, DocumentListResponse, DocumentResponse, DocumentType } from '../types/judge'

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
    onUploadProgress: (event) => {
      if (!event.total || !onProgress) return
      const progress = Math.round((event.loaded / event.total) * 100)
      onProgress(progress)
    },
  })
  return response.data
}

