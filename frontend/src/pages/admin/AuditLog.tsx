import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import PortalLayout from '../../components/layout/PortalLayout'
import { adminGetAuditLogs } from '../../api/admin'
import { queryKeys } from '../../api/queryKeys'

const PAGE_SIZE = 20

const AuditLog = () => {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)

  const skip = (page - 1) * PAGE_SIZE
  const auditQuery = useQuery({
    queryKey: queryKeys.adminAuditLogs(page, PAGE_SIZE),
    queryFn: () => adminGetAuditLogs({ skip, limit: PAGE_SIZE }),
    refetchInterval: 5000,
  })

  const totalPages = useMemo(() => {
    const total = auditQuery.data?.total ?? 0
    return Math.max(1, Math.ceil(total / PAGE_SIZE))
  }, [auditQuery.data?.total])

  return (
    <PortalLayout title={t('admin.pages.auditTitle')} subtitle={t('admin.pages.auditSubtitle')}>
      <section className="panel">
        <h3>{t('admin.tables.auditStream')}</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('admin.audit.timestamp')}</th>
                <th>{t('admin.audit.action')}</th>
                <th>{t('admin.audit.user')}</th>
                <th>{t('admin.audit.resource')}</th>
                <th>{t('admin.audit.description')}</th>
              </tr>
            </thead>
            <tbody>
              {(auditQuery.data?.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.created_at).toLocaleString()}</td>
                  <td>{item.action}</td>
                  <td>{item.user_id ?? '-'}</td>
                  <td>{`${item.resource_type ?? '-'} / ${item.resource_id ?? '-'}`}</td>
                  <td>{item.description ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel-actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            {t('common.back')}
          </button>
          <span className="case-id">{`${page} / ${totalPages}`}</span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            {t('common.next')}
          </button>
        </div>
      </section>
    </PortalLayout>
  )
}

export default AuditLog

