import { useQuery } from '@tanstack/react-query'
import { getAnalysis } from '../api/judge'

export const useCaseAnalysisPolling = (caseId: string | undefined, enabled: boolean) => {
  const query = useQuery({
    queryKey: ['case-analysis', caseId],
    queryFn: () => getAnalysis(caseId as string),
    enabled: Boolean(caseId) && enabled,
    refetchInterval: (queryState) => {
      const analysisStatus = queryState.state.data?.analysis.status
      if (!enabled) return false
      if (analysisStatus === 'AIAnalysisReady') return false
      if (analysisStatus === 'not_found') return 3000
      if (analysisStatus === 'AIAnalysisPending') return 3000
      return false
    },
  })

  const isPolling =
    enabled &&
    (query.isFetching ||
      query.data?.analysis.status === 'AIAnalysisPending' ||
      query.data?.analysis.status === 'not_found')

  return {
    isPolling,
    analysis: query.data,
    error: query.error,
    refetch: query.refetch,
    isLoading: query.isLoading,
  }
}
