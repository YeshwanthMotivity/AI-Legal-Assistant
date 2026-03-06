import { useTranslation } from 'react-i18next'

const UserManagement = () => {
  const { t } = useTranslation()

  return (
    <div style={{ padding: '2rem' }}>
      <h1>{t('admin.userManagement')}</h1>
      <p>Role: {t('roles.admin')}</p>
      <p>Coming soon - User CRUD operations with role management</p>
    </div>
  )
}

export default UserManagement

