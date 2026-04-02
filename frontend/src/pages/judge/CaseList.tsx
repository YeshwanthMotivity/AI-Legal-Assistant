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
  LayoutGrid,
  List,
  Activity,
} from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import CreateCaseModal from '../../components/judge/CreateCaseModal'
import CaseWorkflowStepper from '../../components/layout/CaseWorkflowStepper'
import { createCase, getJudgeCases } from '../../api/judge'
import type { CaseResponse, CreateCaseRequest } from '../../types/judge'
import { cn } from '@/lib/utils'

interface CaseListProps {
  openCreateOnLoad?: boolean
}

type DashboardTab = 'assigned' | 'previous'

const FINAL_STATUSES = new Set(['Finalized'])

const CaseList = ({ openCreateOnLoad = false }: CaseListProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<DashboardTab>('assigned')
  const [isModalOpen, setIsModalOpen] = useState(openCreateOnLoad)
  const [banner, setBanner] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const casesQuery = useQuery({
    queryKey: ['judge-cases'],
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
      setBanner(t('judge.dashboard.caseCreatedSuccess'))
      setIsModalOpen(false)
      if (location.pathname.endsWith('/new')) {
        navigate('/judge/cases', { replace: true })
      }
    },
  })

  const filterBySearch = (item: CaseResponse) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.case_number && item.case_number.toLowerCase().includes(q)) ||
      (item.case_type && item.case_type.toLowerCase().includes(q))
    );
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
        <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col justify-between border border-slate-200">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('judge.caseList.activePortfolio')}</p>
            <h3 className="font-headline text-4xl font-bold text-secondary">
              {casesQuery.isLoading ? '...' : String(stats.active).padStart(2, '0')}
            </h3>
          </div>
          <div className="flex items-center mt-4 text-[11px] font-bold text-primary">
            <Gavel className="w-4 h-4 mr-1" />
            <span>{t('judge.caseList.currentlyAssigned')}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col justify-between border border-slate-200">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('judge.caseList.aiScoredReady')}</p>
            <h3 className="font-headline text-4xl font-bold text-secondary">
              {casesQuery.isLoading ? '...' : String(stats.ready).padStart(2, '0')}
            </h3>
          </div>
          <div className="flex items-center mt-4 text-[11px] font-bold text-emerald-600">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            <span>{t('judge.dashboard.readyForReview')}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col justify-between border border-slate-200">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('judge.caseList.criticalHearings')}</p>
            <h3 className="font-headline text-4xl font-bold text-secondary">
              {casesQuery.isLoading ? '...' : String(stats.urgent).padStart(2, '0')}
            </h3>
          </div>
          <div className="flex items-center mt-4 text-[11px] font-bold text-accent">
            <Clock className="w-4 h-4 mr-1 text-accent" />
            <span>{t('judge.caseList.requireUrgentAttention')}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col justify-between border border-slate-200">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('judge.caseList.decisionsIssued')}</p>
            <h3 className="font-headline text-4xl font-bold text-secondary">
              {casesQuery.isLoading ? '...' : String(stats.finalized).padStart(2, '0')}
            </h3>
          </div>
          <div className="flex items-center mt-4 text-[11px] font-bold text-slate-500">
            <History className="w-4 h-4 mr-1 text-slate-400" />
            <span>{t('judge.caseList.archivedCases')}</span>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-8">
        {/* Filtering & Actions Ribbon */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">

          <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100 w-full lg:w-auto">
            <button
              onClick={() => setActiveTab('assigned')}
              className={cn(
                "px-6 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
                activeTab === 'assigned'
                  ? "bg-white text-primary shadow-sm border border-slate-200"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {t('judge.caseList.activeDocket')}
            </button>
            <button
              onClick={() => setActiveTab('previous')}
              className={cn(
                "px-6 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
                activeTab === 'previous'
                  ? "bg-white text-primary shadow-sm border border-slate-200"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {t('judge.caseList.archive')}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100 w-full sm:w-auto">
              <button
                onClick={() => setViewMode('list')}
                className={cn("p-1.5 rounded-lg transition-colors flex-1 sm:flex-none flex justify-center", viewMode === 'list' ? "bg-white text-primary shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600")}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn("p-1.5 rounded-lg transition-colors flex-1 sm:flex-none flex justify-center", viewMode === 'grid' ? "bg-white text-primary shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600")}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-emerald-50 transition-all font-medium text-secondary"
                placeholder={t('judge.caseList.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              className="text-[11px] font-extrabold uppercase tracking-widest text-white py-2.5 px-8 bg-primary hover:bg-emerald-700 rounded-xl transition-all flex items-center shadow-lg shadow-emerald-900/10 w-full sm:w-auto justify-center"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('judge.caseList.fileNewAction')}
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {banner && (
          <div className="bg-primary-fixed/20 text-primary p-4 rounded-lg border-l-4 border-primary flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-semibold text-sm">{banner}</span>
            <button className="ml-auto p-1 text-primary/70 hover:text-primary rounded-full transition-colors" onClick={() => setBanner('')}>
              <Plus className="w-5 h-5 rotate-45" />
            </button>
          </div>
        )}

        {/* Case List */}
        <div className="space-y-4">
          {casesQuery.isLoading ? (
            <div className="p-10 text-center animate-pulse text-on-surface-variant">{t('judge.caseList.synchronizingCases')}</div>
          ) : casesQuery.isError ? (
            <div className="p-10 text-center text-error border border-error/20 bg-error-container/10 rounded-lg">
              {t('judge.caseList.errorLoadingPortfolio')}
            </div>
          ) : visibleCases.length === 0 ? (
            <div className="p-10 text-center italic text-on-surface-variant bg-surface-container-lowest dark:bg-surface-container rounded-lg border border-outline-variant/30">
              {t('judge.caseList.docketClear')}
            </div>
          ) : (
            <div className={cn(
              "animate-in fade-in duration-500", 
              viewMode === 'grid' ? "grid grid-cols-1 xl:grid-cols-2 gap-6" : "flex flex-col space-y-4"
            )}>
              {visibleCases.map((c) => {
                const isUrgent = c.hearing_date && new Date(c.hearing_date) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

                return (
                  <div key={c.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-primary-light hover:shadow-md transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1 block">
                          {t('judge.caseList.caseIdLabel')}: {c.case_number || c.id.substring(0, 8).toUpperCase()}
                        </span>
                        <h5 className="font-headline text-2xl text-secondary font-bold">{c.title || t('judge.caseList.untitledAction')}</h5>
                      </div>
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight rounded-lg ${
                        isUrgent ? 'bg-terracotta-100 text-terracotta-800' : 'bg-emerald-50 text-emerald-800'
                      }`}>
                        {isUrgent ? t('judge.caseList.urgent') : c.status === 'DraftGenerated' ? t('judge.caseList.draftReady') : t('judge.caseList.processing')}
                      </span>
                    </div>
                    
                    <CaseWorkflowStepper status={c.status} role="judge" compact={true} />

                    <div className="bg-emerald-50/30 border border-emerald-100/50 p-4 rounded-xl mt-3 mb-5 flex items-start gap-3 shadow-inner">
                       <Activity className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                       <div className="space-y-1">
                          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{t('judge.caseList.aiActivityLog', 'System Activity Log')}</p>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">
                            {c.status === 'Created' || c.status === 'DocumentsUploaded' ? t('judge.caseList.logWaiting', 'Awaiting case documents and AI framework trigger. System standing by.') :
                             c.status === 'AIAnalysisPending' ? t('judge.caseList.logProcessing', 'Crunching data: Synthesizing precedents and predicting entitlement breakdowns...') :
                             c.status === 'AIAnalysisReady' ? t('judge.caseList.logInsightsReady', `Execution complete. Precedents matched successfully based on ${c.case_type ? c.case_type.replace('_', ' ') : 'General'} alignment.`) :
                             c.status === 'DraftGenerated' ? t('judge.caseList.logDraftReady', 'Auto-draft generated. Awaiting final judicial review and signature.') :
                             t('judge.caseList.logFinalized', 'Case judgment finalized and permanently encrypted.')}
                          </p>
                       </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 mb-5 pt-3 border-t border-slate-100">
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider text-left">{t('judge.caseList.hearingDate')}</p>
                        <p className="text-sm font-bold text-secondary flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1.5 text-primary" />
                          {c.hearing_date ? new Date(c.hearing_date).toLocaleDateString() : t('judge.caseList.unscheduled')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 pt-4 border-t border-slate-100">
                      <button
                        className="text-[11px] font-bold uppercase tracking-widest text-white py-2 px-6 bg-primary hover:bg-emerald-700 rounded-xl transition-colors flex items-center shadow-lg shadow-emerald-900/10"
                        onClick={() => navigate(`/judge/cases/${c.id}`)}
                      >
                        {t('judge.caseList.openCase')}
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
        <Plus className="w-6 h-6" />
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
