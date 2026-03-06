import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'

const CaseDetail = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()

  return (
    <div style={{ padding: '2rem' }}>
      <h1>{t('case.title')}</h1>
      <p>Role: {t('roles.judge')}</p>
      <p>Case ID: {id}</p>
      <p>Coming soon - Detailed case view with evidence, analysis, and AI insights</p>
      
      <div style={{ marginTop: '2rem' }}>
        <Link to={`/judge/cases/${id}/draft`} style={{ marginRight: '1rem' }}>
          {t('case.draft')}
        </Link>
        <Link to="/judge/cases">{t('common.back')}</Link>
      </div>
    </div>
  )
}

export default CaseDetail

