import { useTranslation } from 'react-i18next'

const CaseAssignment = () => {
  const { t } = useTranslation()

  return (
    <div style={{ padding: '2rem' }}>
      <h1>{t('admin.caseAssignment')}</h1>
      <p>Role: {t('roles.admin')}</p>
      <p>Coming soon - Assign cases to judges</p>
    </div>
  )
}

export default CaseAssignment

