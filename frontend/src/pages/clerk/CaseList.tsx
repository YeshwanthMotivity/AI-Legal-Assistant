import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

const ClerkCaseList = () => {
  const { t } = useTranslation()

  return (
    <div style={{ padding: '2rem' }}>
      <h1>{t('case.title')}</h1>
      <p>Role: {t('roles.clerk')}</p>
      <p>Coming soon - Case list with document upload capabilities</p>
    </div>
  )
}

export default ClerkCaseList

