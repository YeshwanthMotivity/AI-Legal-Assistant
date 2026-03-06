import { useTranslation } from 'react-i18next'

const DocumentUpload = () => {
  const { t } = useTranslation()

  return (
    <div style={{ padding: '2rem' }}>
      <h1>{t('document.upload')}</h1>
      <p>Role: {t('roles.clerk')}</p>
      <p>Coming soon - Document upload with drag and drop</p>
    </div>
  )
}

export default DocumentUpload

