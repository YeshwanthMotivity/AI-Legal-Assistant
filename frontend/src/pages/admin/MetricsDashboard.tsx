import { useTranslation } from 'react-i18next'

const MetricsDashboard = () => {
  const { t } = useTranslation()

  return (
    <div style={{ padding: '2rem' }}>
      <h1>{t('admin.metricsDashboard')}</h1>
      <p>Role: {t('roles.admin')}</p>
      <p>Coming soon - KPI dashboard with retrieval, similarity, and AI metrics</p>
    </div>
  )
}

export default MetricsDashboard

