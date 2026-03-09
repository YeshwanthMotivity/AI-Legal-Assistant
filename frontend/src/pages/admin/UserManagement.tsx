import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import PortalLayout from '../../components/layout/PortalLayout'
import { adminCreateUser, adminDeactivateUser, adminGetUsers } from '../../api/admin'
import { queryKeys } from '../../api/queryKeys'
import type { AdminCreateUserRequest } from '../../types/admin'

const UserManagement = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [form, setForm] = useState<AdminCreateUserRequest>({
    email: '',
    username: '',
    full_name: '',
    role: 'clerk',
    password: '',
  })

  const usersQuery = useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: () => adminGetUsers({ limit: 500 }),
  })

  const createMutation = useMutation({
    mutationFn: adminCreateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers })
      setMessageType('success')
      setMessage(t('admin.messages.userCreated'))
      setIsCreateOpen(false)
      setForm({ email: '', username: '', full_name: '', role: 'clerk', password: '' })
    },
    onError: () => {
      setMessageType('error')
      setMessage(t('admin.messages.userCreateFailed'))
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: adminDeactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers })
      setMessageType('success')
      setMessage(t('admin.messages.userDeactivated'))
    },
    onError: () => {
      setMessageType('error')
      setMessage(t('admin.messages.userDeactivateFailed'))
    },
  })

  return (
    <PortalLayout title={t('admin.pages.usersTitle')} subtitle={t('admin.pages.usersSubtitle')}>
      {message && <div className={messageType === 'error' ? 'error-banner' : 'success-banner'}>{message}</div>}

      <section className="panel">
        <div className="panel-title-row">
          <h3>{t('admin.forms.userManagement')}</h3>
          <button type="button" className="btn-primary" onClick={() => setIsCreateOpen((prev) => !prev)}>
            {t('admin.forms.createUser')}
          </button>
        </div>

        {isCreateOpen ? (
          <div className="form-grid two-col">
            <label>
              {t('admin.forms.email')}
              <input value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
            </label>
            <label>
              {t('admin.forms.username')}
              <input value={form.username} onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))} />
            </label>
            <label>
              {t('admin.forms.fullName')}
              <input value={form.full_name} onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))} />
            </label>
            <label>
              {t('admin.forms.role')}
              <select value={form.role} onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as AdminCreateUserRequest['role'] }))}>
                <option value="admin">{t('roles.admin')}</option>
                <option value="judge">{t('roles.judge')}</option>
                <option value="clerk">{t('roles.clerk')}</option>
              </select>
            </label>
            <label>
              {t('admin.forms.password')}
              <input type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} />
            </label>
            <div className="panel-actions">
              <button type="button" className="btn-secondary" onClick={() => setIsCreateOpen(false)}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={createMutation.isPending}
                onClick={() => {
                  if (!form.email || !form.username || !form.password) {
                    setMessageType('error')
                    setMessage(t('admin.messages.requiredFields'))
                    return
                  }
                  createMutation.mutate(form)
                }}
              >
                {createMutation.isPending ? t('common.loading') : t('common.submit')}
              </button>
            </div>
          </div>
        ) : null}

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('admin.forms.username')}</th>
                <th>{t('admin.forms.email')}</th>
                <th>{t('admin.forms.role')}</th>
                <th>{t('admin.forms.status')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {(usersQuery.data ?? []).map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{t(`roles.${user.role}`)}</td>
                  <td>{String(user.is_active).toLowerCase() === 'true' ? t('admin.forms.active') : t('admin.forms.inactive')}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={deactivateMutation.isPending}
                      onClick={() => {
                        if (!window.confirm(t('admin.messages.confirmDeactivate'))) return
                        deactivateMutation.mutate(user.id)
                      }}
                    >
                      {t('admin.forms.deactivate')}
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

export default UserManagement
