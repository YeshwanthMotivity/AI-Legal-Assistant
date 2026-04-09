import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Clock,
  CheckCircle2,
  Gavel,
  History,
  FileText,
  Trash2,
} from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import CreateCaseModal from '../../components/judge/CreateCaseModal'
import { createCase, getJudgeCases, deleteCase } from '../../api/judge'
import type { CaseResponse, CreateCaseRequest } from '../../types/judge'
import { cn } from '@/lib/utils'

interface CaseListProps {
  openCreateOnLoad?: boolean
}

type DashboardTab = 'assigned' | 'previous'

const FINAL_STATUSES = new Set(['CaseClosed'])

const CaseList = ({ openCreateOnLoad = false }: CaseListProps) => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<DashboardTab>('assigned')
  const [isModalOpen, setIsModalOpen] = useState(openCreateOnLoad)
  const [banner, setBanner] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const casesQuery = useQuery({
    queryKey: queryKeys.judgeCases({ limit: 200 }),
    queryFn: () => getJudgeCases({ limit: 200 }),
  })

  useEffect(() => {
    if (openCreateOnLoad) {
      setIsModalOpen(true)
    }
  }, [openCreateOnLoad])

  const createCaseMutation = useMutation({
    mutationFn: (payload: CreateCaseRequest) => createCase(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judge-cases'] })
      setBanner(t('judge.dashboard.caseCreatedSuccess', 'Case created successfully.'))
      setIsModalOpen(false)
      if (location.pathname.endsWith('/new')) {
        navigate('/judge/cases', { replace: true })
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judge-cases'] })
      setBanner(t('judge.dashboard.caseDeletedSuccess', 'Case deleted successfully.'))
    },
  })

  const handleDeleteCase = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (window.confirm(t('judge.caseList.confirmDelete', 'Are you sure you want to delete this case?'))) {
      deleteMutation.mutate(id)
    }
  }

  const filterBySearch = (item: CaseResponse) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.case_number && item.case_number.toLowerCase().includes(q)) ||
      (item.case_type && item.case_type.toLowerCase().includes(q))
    )
  }

  const assignedCases = useMemo(
    () => (casesQuery.data?.items ?? []).filter((item) => !FINAL_STATUSES.has(item.status)).filter(filterBySearch),
    [casesQuery.data?.items, searchQuery]
  )

  const previousCases = useMemo(
    () => (casesQuery.data?.items ?? []).filter((item) => FINAL_STATUSES.has(item.status)).filter(filterBySearch),
    [casesQuery.data?.items, searchQuery]
  )

  const visibleCases: CaseResponse[] = activeTab === 'assigned' ? assignedCases : previousCases

  const stats = useMemo(() => {
    const items = casesQuery.data?.items ?? []
    return {
      active: items.filter(c => !FINAL_STATUSES.has(c.status)).length,
      finalized: items.filter(c => FINAL_STATUSES.has(c.status)).length,
      ready: items.filter(c => c.status === 'AIAnalysisReady').length,
      urgent: items.filter(c => c.hearing_date && new Date(c.hearing_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length
    }
  }, [casesQuery.data])

  return (
    <PortalLayout title={t('judge.caseList.chamberRegistry')} subtitle={t('judge.caseList.managePortfolio')}>

      {/* 1. Top Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-[var(--bg-card)] p-6 rounded-lg editorial-shadow flex flex-col justify-between border border-outline-variant/30">
          <div>
            <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">{t('judge.caseList.activePortfolio')}</p>
            <h3 className="font-headline text-3xl font-medium text-primary">
              {casesQuery.isLoading ? '...' : String(stats.active).padStart(2, '0')}
            </h3>
          </div>
          <div className="flex items-center mt-4 text-[11px] font-medium text-[var(--primary)]">
            <Gavel className="w-4 h-4 mr-1"/>
            <span>{t('judge.caseList.currentlyAssigned')}</span>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] p-6 rounded-lg editorial-shadow flex flex-col justify-between border border-outline-variant/30">
          <div>
            <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">{t('judge.caseList.aiScoredReady')}</p>
            <h3 className="font-headline text-3xl font-medium text-primary">
              {casesQuery.isLoading ? '...' : String(stats.ready).padStart(2, '0')}
            </h3>
          </div>
          <div className="flex items-center mt-4 text-[11px] font-medium text-[var(--primary)]">
            <CheckCircle2 className="w-4 h-4 mr-1"/>
            <span>{t('judge.dashboard.readyForReview')}</span>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] p-6 rounded-lg editorial-shadow flex flex-col justify-between border border-outline-variant/30">
          <div>
            <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">{t('judge.caseList.criticalHearings')}</p>
            <h3 className="font-headline text-3xl font-medium text-primary">
              {casesQuery.isLoading ? '...' : String(stats.urgent).padStart(2, '0')}
            </h3>
          </div>
          <div className="flex items-center mt-4 text-[11px] font-medium text-error">
            <Clock className="w-4 h-4 mr-1 text-error"/>
            <span>{t('judge.caseList.requireUrgentAttention')}</span>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] p-6 rounded-lg editorial-shadow flex flex-col justify-between border border-outline-variant/30">
          <div>
            <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">{t('judge.caseList.decisionsIssued')}</p>
            <h3 className="font-headline text-2xl font-semibold text-primary">
              {casesQuery.isLoading ? '...' : String(stats.finalized).padStart(2, '0')}
            </h3>
          </div>
          <div className="flex items-center mt-4 text-[11px] font-medium text-on-surface-variant">
            <History className="w-4 h-4 mr-1 text-on-surface-variant"/>
            <span>{t('judge.caseList.archivedCases')}</span>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-8">
        {/* Filtering & Actions Ribbon */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-[var(--bg-card)] p-4 rounded-lg editorial-shadow border border-outline-variant/30">

          <div className="flex bg-surface-container-low-high p-1.5 rounded border border-outline-variant/20 w-full lg:w-auto">
            <button
              onClick={() => setActiveTab('assigned')}
              className={cn(
                "px-6 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-all",
                activeTab === 'assigned'
                  ?"bg-[var(--bg-card)] text-primary shadow-sm border border-outline-variant/20"
                  :"text-on-surface-variant hover:text-on-surface"
              )}
            >
              {t('judge.caseList.activeDocket')}
            </button>
            <button
              onClick={() => setActiveTab('previous')}
              className={cn(
                "px-6 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-all",
                activeTab === 'previous'
                  ?"bg-[var(--bg-card)] text-primary shadow-sm border border-outline-variant/20"
                  :"text-on-surface-variant hover:text-on-surface"
              )}
            >
              {t('judge.caseList.finalizedDecisions', 'Finalized Outcomes')}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant"/>
              <input
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-tertiary focus:ring-1 focus:ring-tertiary/20 transition-all font-medium text-on-surface"
                placeholder={t('judge.caseList.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              className="text-[11px] font-bold uppercase tracking-wider text-on-primary py-2.5 px-6 bg-primary hover:opacity-90 rounded transition-colors flex items-center shadow-lg shadow-primary/20 w-full sm:w-auto justify-center"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-2"/>
              {t('judge.caseList.fileNewAction')}
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {banner && (
          <div className="bg-primary-fixed/20 text-primary p-4 rounded-lg border-l-4 border-primary flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 className="w-4 h-4"/>
            <span className="font-semibold text-sm">{banner}</span>
            <button className="ml-auto p-1 text-primary/70 hover:text-primary rounded-full transition-colors" onClick={() => setBanner('')}>
              <Plus className="w-5 h-5 rotate-45"/>
            </button>
          </div>
        )}

        {/* Case List Header */}
        <div className="flex items-center gap-3 mb-2 px-2">
          <div className="w-1.5 h-6 bg-primary rounded-full" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/60">
            {activeTab === 'assigned' ? t('judge.caseList.activeDocket') : t('judge.caseList.finalizedDecisions', 'Finalized Outcomes')}
          </h2>
        </div>

        {/* Case List */}
        <div className="space-y-4">
          {casesQuery.isLoading ? (
            <div className="p-10 text-center animate-pulse text-on-surface-variant">{t('judge.caseList.synchronizingCases')}</div>
          ) : casesQuery.isError ? (
            <div className="p-10 text-center text-error border border-error/20 bg-error-container/10 rounded-lg">
              {t('judge.caseList.errorLoadingPortfolio')}
            </div>
          ) : visibleCases.length === 0 ? (
            <div className="p-10 text-center italic text-on-surface-variant bg-[var(--bg-card)] rounded-lg border border-outline-variant/30">
              {t('judge.caseList.docketClear')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {visibleCases.map((c) => {
                const isUrgent = c.hearing_date && new Date(c.hearing_date) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

                return (
                  <div key={c.id} className="bg-[var(--bg-card)] p-6 flex flex-col h-full rounded-2xl editorial-shadow border border-outline-variant/30 hover:shadow-xl dark:hover:bg-surface-container-high transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] font-bold text-tertiary tracking-widest uppercase mb-1.5 block">
                          {t('judge.caseList.caseIdLabel')}: {c.case_number || c.id.substring(0, 8).toUpperCase()}
                        </span>
                        <h5 className="font-headline text-lg tracking-tight text-on-surface font-black line-clamp-2">{c.title || t('judge.caseList.untitledAction')}</h5>
                      </div>
                      <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md shrink-0 ml-3 ${
                        isUrgent ? 'bg-error text-white' : FINAL_STATUSES.has(c.status) ? 'bg-green-100 text-green-800' : 'bg-primary/10 text-primary'
                      }`}>
                        {FINAL_STATUSES.has(c.status) ? t('common.completed', 'Completed') : isUrgent ? t('judge.caseList.urgent') : c.status === 'DraftGenerated' ? t('judge.caseList.draftReady') : t('judge.caseList.processing')}
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 mb-6 mt-auto">
                      <div className="space-y-2 bg-surface-container-low p-3 rounded-lg overflow-hidden">
                        <p className="text-[11px] text-on-surface-variant font-medium flex items-center line-clamp-1">
                          <FileText className="w-3.5 h-3.5 mr-2 text-primary shrink-0"/>
                          {c.case_type ? t(`judge.caseTypes.${c.case_type}`) : t('judge.caseList.generalDispute')}
                        </p>
                        <p className="text-[11px] text-on-surface-variant font-medium flex items-center line-clamp-1">
                          <History className="w-3.5 h-3.5 mr-2 text-primary shrink-0"/>
                          {c.status === 'AIAnalysisReady' ? t('judge.caseList.precedentsMatched') : c.status === 'DraftGenerated' ? t('judge.caseList.draftReady') : FINAL_STATUSES.has(c.status) ? t('common.caseClosed', 'Case Closed') : t('judge.caseList.processingPending')}
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-outline-variant/30 pt-3">
                        <div className="text-left">
                          <p className="text-[9px] text-on-surface-variant font-black uppercase tracking-widest leading-none mb-1">{t('judge.caseList.hearingDate')}</p>
                          <p className="text-xs font-black tracking-tight text-primary leading-none">
                            {c.hearing_date ? new Date(c.hearing_date).toLocaleDateString() : t('judge.caseList.unscheduled')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                      <button
                        className="text-[10px] font-black uppercase tracking-widest text-on-primary py-2.5 px-5 bg-primary hover:bg-primary-hover rounded-xl transition-colors flex items-center shadow-lg shadow-primary/20 w-fit"
                        onClick={() => navigate(`/judge/cases/${c.id}`)}
                      >
                        {t('judge.caseList.openCase')}
                      </button>

                      <button
                        className="text-[10px] font-black uppercase tracking-widest text-error/70 hover:text-error hover:bg-error/10 p-2.5 rounded-xl transition-all flex items-center justify-center border border-transparent hover:border-error/20"
                        onClick={(e) => handleDeleteCase(e, c.id)}
                        disabled={deleteMutation.isPending}
                        title={t('common.delete', 'Delete')}
                      >
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform duration-300 z-50"
        onClick={() => setIsModalOpen(true)}
        title={t('judge.caseList.fileNewAction')}
      >
        <Plus className="w-6 h-6"/>
      </button>

      <CreateCaseModal
        isOpen={isModalOpen}
        isSubmitting={createCaseMutation.isPending}
        onClose={() => {
          setIsModalOpen(false)
          if (location.pathname.endsWith('/new')) {
            navigate('/judge/cases', { replace: true })
          }
        }}
        onSubmit={(payload) => createCaseMutation.mutateAsync(payload)}
      />
    </PortalLayout>
  )
}

export default CaseList
