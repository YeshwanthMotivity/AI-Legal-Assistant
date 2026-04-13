import apiClient from './client'
import type { AdminAuditLogResponse } from '../types/admin'

export interface CaseActivityLog {
  id: string
  user_id: string
  action: string
  resource_type: string
  resource_id: string
  extra_metadata: any
  created_at: string
}

export const getCaseActivity = async (caseId: string, limit: number = 50) => {
  const response = await apiClient.get<CaseActivityLog[]>('/audit', { 
    params: { case_id: caseId, limit } 
  })
  return response.data
}
