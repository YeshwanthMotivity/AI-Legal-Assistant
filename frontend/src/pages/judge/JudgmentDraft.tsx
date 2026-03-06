import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'

const JudgmentDraft = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()

  return (
    <div style={{ padding: '2rem' }}>
      <h1>{t('case.draft')}</h1>
      <p>Role: {t('roles.judge')}</p>
      <p>Case ID: {id}</p>
      <p>Coming soon - AI-generated judgment draft with editing capabilities</p>
      
      <div style={{ marginTop: '2rem' }}>
        <Link to={`/judge/cases/${id}`}>{t('common.back')}</Link>
      </div>
    </div>
  )
}

export default JudgmentDraft

