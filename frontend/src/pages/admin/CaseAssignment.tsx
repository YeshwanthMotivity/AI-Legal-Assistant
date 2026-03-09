import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import PortalLayout from '../../components/layout/PortalLayout'
import { adminAssignCase, adminGetCases, adminGetUsers } from '../../api/admin'
import { queryKeys } from '../../api/queryKeys'

const CaseAssignment = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [judgeMap, setJudgeMap] = useState<Record<string, string>>({})

  const usersQuery = useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: () => adminGetUsers({ limit: 500 }),
  })

  const casesQuery = useQuery({
    queryKey: queryKeys.adminCases,
    queryFn: () => adminGetCases({ limit: 500 }),
  })

  const judges = useMemo(
    () => (usersQuery.data ?? []).filter((user) => user.role === 'judge' && String(user.is_active).toLowerCase() === 'true'),
    [usersQuery.data]
  )

  const judgeName = (judgeId: string | null | undefined) => {
    if (!judgeId) return '-'
    const found = judges.find((judge) => judge.id === judgeId)
    return found ? found.username : judgeId
  }

  const assignMutation = useMutation({
    mutationFn: ({ caseId, judgeId }: { caseId: string; judgeId: string }) => adminAssignCase(caseId, judgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminCases })
      setMessageType('success')
      setMessage(t('admin.messages.caseAssigned'))
    },
    onError: () => {
      setMessageType('error')
      setMessage(t('admin.messages.caseAssignFailed'))
    },
  })

  const unassigned = (casesQuery.data?.items ?? []).filter((item) => !item.assigned_to)
  const assigned = (casesQuery.data?.items ?? []).filter((item) => Boolean(item.assigned_to))

  return (
    <PortalLayout title={t('admin.pages.assignmentsTitle')} subtitle={t('admin.pages.assignmentsSubtitle')}>
      {message && <div className={messageType === 'error' ? 'error-banner' : 'success-banner'}>{message}</div>}

      <section className="panel">
        <h3>{t('admin.tables.unassignedCases')}</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('case.caseNumber')}</th>
                <th>{t('clerk.forms.title')}</th>
                <th>{t('case.caseType')}</th>
                <th>{t('admin.forms.assignJudge')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {unassigned.map((item) => (
                <tr key={item.id}>
                  <td>{item.case_number}</td>
                  <td>{item.title}</td>
                  <td>{t(`judge.caseTypes.${item.case_type}`)}</td>
                  <td>
                    <select
                      value={judgeMap[item.id] ?? ''}
                      onChange={(event) => setJudgeMap((prev) => ({ ...prev, [item.id]: event.target.value }))}
                    >
                      <option value="">{t('admin.forms.selectJudge')}</option>
                      {judges.map((judge) => (
                        <option key={judge.id} value={judge.id}>
                          {judge.username}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={!judgeMap[item.id] || assignMutation.isPending}
                      onClick={() => assignMutation.mutate({ caseId: item.id, judgeId: judgeMap[item.id] })}
                    >
                      {t('admin.forms.assign')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3>{t('admin.tables.assignedCases')}</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('case.caseNumber')}</th>
                <th>{t('clerk.forms.title')}</th>
                <th>{t('clerk.forms.assignedJudge')}</th>
                <th>{t('admin.forms.reassign')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {assigned.map((item) => (
                <tr key={item.id}>
                  <td>{item.case_number}</td>
                  <td>{item.title}</td>
                  <td>{judgeName(item.assigned_to)}</td>
                  <td>
                    <select
                      value={judgeMap[item.id] ?? item.assigned_to ?? ''}
                      onChange={(event) => setJudgeMap((prev) => ({ ...prev, [item.id]: event.target.value }))}
                    >
                      {judges.map((judge) => (
                        <option key={judge.id} value={judge.id}>
                          {judge.username}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={!judgeMap[item.id] || assignMutation.isPending}
                      onClick={() => assignMutation.mutate({ caseId: item.id, judgeId: judgeMap[item.id] })}
                    >
                      {t('admin.forms.reassign')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PortalLayout>
  )
}

export default CaseAssignment
