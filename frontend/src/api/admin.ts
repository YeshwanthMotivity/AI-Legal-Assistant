import apiClient from './client'
import type {
  AdminAuditLogResponse,
  AdminCreateUserRequest,
  AdminMetricsResponse,
  AdminUser,
} from '../types/admin'
import type { CaseListResponse } from '../types/judge'
import type { BenchmarkRunResult, ReleaseGate, ReleaseGateRequest } from '../types/evaluation'

export const adminGetUsers = async (params: { skip?: number; limit?: number } = {}) => {
  const response = await apiClient.get<AdminUser[]>('/admin/users', { params })
  return response.data
}

export const adminCreateUser = async (payload: AdminCreateUserRequest) => {
  const response = await apiClient.post<AdminUser>('/admin/users', payload)
  return response.data
}

export const adminDeactivateUser = async (userId: string) => {
  await apiClient.delete(`/admin/users/${userId}`)
}

export const adminActivateUser = async (userId: string) => {
  await apiClient.patch(`/admin/users/${userId}/activate`)
}

export const adminDeleteUserPermanent = async (userId: string) => {
  await apiClient.delete(`/admin/users/${userId}/permanent`)
}

export const adminGetCases = async (params: { skip?: number; limit?: number; status?: string } = {}) => {
  const response = await apiClient.get<CaseListResponse>('/cases', { params })
  return response.data
}



export const adminGetAuditLogs = async (params: { skip?: number; limit?: number } = {}) => {
  const response = await apiClient.get<AdminAuditLogResponse>('/admin/audit-logs', { params })
  return response.data
}

// Extended metrics — accepts phase / metric_type / time_window filters
export const adminGetMetrics = async (
  params: { metric_type?: string; phase?: string; time_window?: number } = {}
) => {
  const response = await apiClient.get<AdminMetricsResponse>('/admin/metrics', { params })
  return response.data
}

// Benchmark
export const adminRunBenchmark = async (mode: 'dense_baseline' | 'hybrid' = 'dense_baseline') => {
  const response = await apiClient.post<BenchmarkRunResult>('/admin/benchmark/run', { mode })
  return response.data
}

export const adminGetBenchmarkLatest = async (mode: 'dense_baseline' | 'hybrid' = 'dense_baseline') => {
  const response = await apiClient.get<BenchmarkRunResult>('/admin/benchmark/latest', { params: { mode } })
  return response.data
}

// Release Gate
export const adminGetReleaseGate = async (phase?: string) => {
  const response = await apiClient.get<ReleaseGate[]>('/admin/release-gate', {
    params: phase ? { phase } : {},
  })
  return response.data
}

export const adminSubmitReleaseGate = async (payload: ReleaseGateRequest) => {
  const response = await apiClient.post<ReleaseGate>('/admin/release-gate', payload)
  return response.data
}
