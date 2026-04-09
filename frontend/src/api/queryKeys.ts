export const queryKeys = {
  clerkCases: (params: any = {}) => ['clerk-cases', params] as const,
  judgeCases: (params: any = {}) => ['judge-cases', params] as const,
  judgeCase: (caseId: string) => ['judge-case', caseId] as const,
  clerkCase: (caseId: string) => ['clerk-case', caseId] as const,
  clerkCaseDocuments: (caseId: string) => ['clerk-case-documents', caseId] as const,
  adminUsers: ['admin-users'] as const,
  adminCases: ['admin-cases'] as const,
  adminMetrics: ['admin-metrics'] as const,
  adminAuditLogs: (page: number, limit: number) => ['admin-audit-logs', page, limit] as const,
  judges: ['judges'] as const,
}

