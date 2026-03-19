import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import PortalLayout from '../../components/layout/PortalLayout'
import { clerkCreateCase, clerkGetCases, clerkUpdateCaseMetadata } from '../../api/clerk'
import { queryKeys } from '../../api/queryKeys'
import type { CaseStatus, CaseType } from '../../types/judge'

const CASE_TYPES: CaseType[] = [
  'unpaid_wages',
  'wrongful_termination',
  'end_of_service',
  'contract_dispute',
  'other',
]

const STATUS_OPTIONS: CaseStatus[] = [
  'Created',
  'DocumentsUploaded',
  'AIAnalysisPending',
  'AIAnalysisReady',
  'DraftGenerated',
  'Finalized',
]

const ClerkCaseList = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [selectedCaseId, setSelectedCaseId] = useState('')

  const [createForm, setCreateForm] = useState({
    title: '',
    case_type: 'unpaid_wages' as CaseType,
    claimant_name: '',
    respondent_name: '',
    filing_date: '',
    court_number: '',
  })

  const [metadataForm, setMetadataForm] = useState({
    hearing_date: '',
    status: 'Created' as CaseStatus,
  })

  const casesQuery = useQuery({
    queryKey: queryKeys.clerkCases,
    queryFn: () => clerkGetCases({ limit: 200 }),
  })

  const selectedCase = useMemo(
    () => (casesQuery.data?.items ?? []).find((item) => item.id === selectedCaseId),
    [casesQuery.data?.items, selectedCaseId]
  )

  const createCaseMutation = useMutation({
    mutationFn: clerkCreateCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clerkCases })
      setMessageType('success')
      setMessage(t('clerk.messages.caseCreated'))
      setCreateForm({
        title: '',
        case_type: 'unpaid_wages',
        claimant_name: '',
        respondent_name: '',
        filing_date: '',
        court_number: '',
      })
    },
    onError: () => {
      setMessageType('error')
      setMessage(t('clerk.messages.caseCreateFailed'))
    },
  })

  const updateCaseMutation = useMutation({
    mutationFn: ({ caseId, payload }: { caseId: string; payload: { hearing_date?: string; status?: string } }) =>
      clerkUpdateCaseMetadata(caseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clerkCases })
      setMessageType('success')
      setMessage(t('clerk.messages.caseUpdated'))
    },
    onError: () => {
      setMessageType('error')
      setMessage(t('clerk.messages.caseUpdateFailed'))
    },
  })

  return (
    <PortalLayout title={t('clerk.pages.casesTitle')} subtitle={t('clerk.pages.casesSubtitle')}>
      {message && <div className={messageType === 'error' ? 'error-banner' : 'success-banner'}>{message}</div>}

      <section className="panel">
        <h3>{t('clerk.forms.createCase')}</h3>
        <div className="form-grid two-col">
          <label>
            {t('clerk.forms.title')}
            <input
              value={createForm.title}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </label>

          <label>
            {t('clerk.forms.caseType')}
            <select
              value={createForm.case_type}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, case_type: event.target.value as CaseType }))}
            >
              {CASE_TYPES.map((caseType) => (
                <option key={caseType} value={caseType}>
                  {t(`judge.caseTypes.${caseType}`)}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t('clerk.forms.claimant')}
            <input
              value={createForm.claimant_name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, claimant_name: event.target.value }))}
            />
          </label>

          <label>
            {t('clerk.forms.respondent')}
            <input
              value={createForm.respondent_name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, respondent_name: event.target.value }))}
            />
          </label>

          <label>
            {t('clerk.forms.filingDate')}
            <input
              type="date"
              value={createForm.filing_date}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, filing_date: event.target.value }))}
            />
          </label>

          <label>
            {t('clerk.forms.courtNumber')}
            <input
              value={createForm.court_number}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, court_number: event.target.value }))}
            />
          </label>
        </div>
        <div className="panel-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={createCaseMutation.isPending}
            onClick={() => {
              if (
                !createForm.title ||
                !createForm.claimant_name ||
                !createForm.respondent_name ||
                !createForm.filing_date
              ) {
                setMessageType('error')
                setMessage(t('clerk.messages.requiredFields'))
                return
              }

              createCaseMutation.mutate({
                ...createForm,
                filing_date: `${createForm.filing_date}T00:00:00`,
              })
            }}
          >
            {createCaseMutation.isPending ? t('common.loading') : t('clerk.forms.createCaseAction')}
          </button>
        </div>
      </section>

      <section className="panel">
        <h3>{t('clerk.tables.recentCases')}</h3>
        {casesQuery.isLoading && <p>{t('common.loading')}</p>}
        {casesQuery.isError && <p className="error-text">{t('common.error')}</p>}

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('case.caseNumber')}</th>
                <th>{t('clerk.forms.title')}</th>
                <th>{t('case.caseType')}</th>
                <th>{t('case.status')}</th>
                <th>{t('clerk.forms.assignedJudge')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {(casesQuery.data?.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td>{item.case_number}</td>
                  <td>{item.title}</td>
                  <td>{t(`judge.caseTypes.${item.case_type}`)}</td>
                  <td>{t(`status.${item.status}`)}</td>
                  <td>{item.assigned_to ?? '-'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setSelectedCaseId(item.id)
                        setMetadataForm({
                          hearing_date: item.hearing_date ? item.hearing_date.slice(0, 10) : '',
                          status: item.status,
                        })
                      }}
                    >
                      {t('clerk.forms.editMetadata')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedCase ? (
        <section className="panel">
          <h3>{t('clerk.forms.metadataEditor')}</h3>
          <p className="case-id">{selectedCase.case_number}</p>
          <div className="form-grid two-col">
            <label>
              {t('clerk.forms.hearingDate')}
              <input
                type="date"
                value={metadataForm.hearing_date}
                onChange={(event) => setMetadataForm((prev) => ({ ...prev, hearing_date: event.target.value }))}
              />
            </label>

            <label>
              {t('case.status')}
              <select
                value={metadataForm.status}
                onChange={(event) => setMetadataForm((prev) => ({ ...prev, status: event.target.value as CaseStatus }))}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {t(`status.${status}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="panel-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setSelectedCaseId('')}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={updateCaseMutation.isPending}
              onClick={() => {
                updateCaseMutation.mutate({
                  caseId: selectedCase.id,
                  payload: {
                    hearing_date: metadataForm.hearing_date ? `${metadataForm.hearing_date}T10:00:00` : undefined,
                    status: metadataForm.status,
                  },
                })
              }}
            >
              {updateCaseMutation.isPending ? t('common.loading') : t('clerk.forms.saveMetadata')}
            </button>
          </div>
        </section>
      ) : null}
    </PortalLayout>
  )
}

export default ClerkCaseList
