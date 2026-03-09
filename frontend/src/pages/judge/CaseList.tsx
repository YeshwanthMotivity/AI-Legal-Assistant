import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import LanguageToggle from '../../components/LanguageToggle'
import CreateCaseModal from '../../components/judge/CreateCaseModal'
import { createCase, getJudgeCases } from '../../api/judge'
import type { CaseResponse, CreateCaseRequest } from '../../types/judge'

interface CaseListProps {
  openCreateOnLoad?: boolean
}

type DashboardTab = 'assigned' | 'previous'

const FINAL_STATUSES = new Set(['Finalized'])

const getStatusClass = (status: string) => {
  const normalized = status.toLowerCase()
  if (normalized.includes('ready') || normalized.includes('finalized')) return 'status-badge done'
  if (normalized.includes('pending')) return 'status-badge pending'
  return 'status-badge active'
}

const CaseList = ({ openCreateOnLoad = false }: CaseListProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<DashboardTab>('assigned')
  const [isModalOpen, setIsModalOpen] = useState(openCreateOnLoad)
  const [banner, setBanner] = useState('')

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

  const assignedCases = useMemo(
    () => (casesQuery.data?.items ?? []).filter((item) => !FINAL_STATUSES.has(item.status)),
    [casesQuery.data?.items]
  )

  const previousCases = useMemo(
    () => (casesQuery.data?.items ?? []).filter((item) => FINAL_STATUSES.has(item.status)),
    [casesQuery.data?.items]
  )

  const visibleCases: CaseResponse[] = activeTab === 'assigned' ? assignedCases : previousCases

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <h1>{t('judge.dashboard.title')}</h1>
          <p>{t('judge.dashboard.subtitle')}</p>
        </div>
        <div className="header-actions">
          <LanguageToggle />
          <button type="button" className="btn-primary" onClick={() => setIsModalOpen(true)}>
            {t('judge.dashboard.createCase')}
          </button>
        </div>
      </header>

      {banner && <div className="success-banner">{banner}</div>}

      <div className="tabs">
        <button
          type="button"
          className={activeTab === 'assigned' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('assigned')}
        >
          {t('judge.dashboard.assignedCases')}
        </button>
        <button
          type="button"
          className={activeTab === 'previous' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('previous')}
        >
          {t('judge.dashboard.previousCases')}
        </button>
      </div>

      {casesQuery.isLoading && <p>{t('common.loading')}</p>}
      {casesQuery.error && <p className="error-text">{t('common.error')}</p>}

      <div className="cards-grid">
        {visibleCases.map((item) => (
          <article className="case-card" key={item.id}>
            <div className="case-card-top">
              <span className="case-id">{item.case_number}</span>
              <span className={getStatusClass(item.status)}>{t(`status.${item.status}`)}</span>
            </div>
            <h3>{item.title}</h3>
            <p>{t(`judge.caseTypes.${item.case_type}`)}</p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(`/judge/cases/${item.id}`)}
            >
              {activeTab === 'assigned' ? t('judge.dashboard.openCase') : t('judge.dashboard.viewCase')}
            </button>
          </article>
        ))}
      </div>

      {!casesQuery.isLoading && visibleCases.length === 0 && (
        <p className="empty-state">{t('judge.dashboard.noCases')}</p>
      )}

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
    </div>
  )
}

export default CaseList
