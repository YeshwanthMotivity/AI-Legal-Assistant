export const queryKeys = {
  clerkCases: ['clerk-cases'] as const,
  clerkCaseDocuments: (caseId: string) => ['clerk-case-documents', caseId] as const,
  adminUsers: ['admin-users'] as const,
  adminCases: ['admin-cases'] as const,
  adminMetrics: ['admin-metrics'] as const,
  adminAuditLogs: (page: number, limit: number) => ['admin-audit-logs', page, limit] as const,
}

