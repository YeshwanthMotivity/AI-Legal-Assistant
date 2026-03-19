import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import PortalLayout from '../../components/layout/PortalLayout'
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
    <PortalLayout title={t('judge.dashboard.title')} subtitle={t('judge.dashboard.subtitle')}>
      <div className="header-actions" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          {t('judge.dashboard.createCase')}
        </button>
      </div>

      {banner && <div className="success-banner">{banner}</div>}

      <div className="tab-container">
        <button
          type="button"
          className={activeTab === 'assigned' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('assigned')}
        >
          {t('judge.dashboard.assignedCases')}
        </button>
        <button
          type="button"
          className={activeTab === 'previous' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('previous')}
        >
          {t('judge.dashboard.previousCases')}
        </button>
      </div>

      {casesQuery.isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="mono">{t('common.loading')}...</div>
        </div>
      )}
      
      {casesQuery.error && (
        <div className="error-banner">{t('common.error')}</div>
      )}

      <div className="grid-dashboard">
        {visibleCases.map((item) => (
          <article className="case-card" key={item.id} onClick={() => navigate(`/judge/cases/${item.id}`)} style={{ cursor: 'pointer' }}>
            <div className="case-card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.case_number}</span>
              <span className={getStatusClass(item.status)}>{t(`status.${item.status}`)}</span>
            </div>
            
            <h3 className="judicial-title" style={{ fontSize: '1.25rem', lineHeight: '1.4', margin: '0.5rem 0' }}>
              {item.title}
            </h3>
            
            <div style={{ color: 'var(--emerald-600)', fontSize: '0.9rem', fontWeight: '600' }}>
              {t(`judge.caseTypes.${item.case_type}`)}
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: 'auto' }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/judge/cases/${item.id}`);
              }}
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
    </PortalLayout>
  )
}

export default CaseList
