import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageToggle from '../LanguageToggle'
import { useAuth } from '../../auth/useAuth'

interface PortalLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
}

const PortalLayout = ({ title, subtitle, children }: PortalLayoutProps) => {
  const { t } = useTranslation()
  const { user, logout } = useAuth()

  const links =
    user?.role === 'clerk'
      ? [
          { to: '/clerk/cases', label: t('clerk.nav.cases') },
          { to: '/clerk/documents', label: t('clerk.nav.documents') },
        ]
      : [
          { to: '/admin/metrics', label: t('admin.nav.metrics') },
          { to: '/admin/users', label: t('admin.nav.users') },
          { to: '/admin/assignments', label: t('admin.nav.assignments') },
          { to: '/admin/audit', label: t('admin.nav.audit') },
        ]

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <div className="header-actions">
          <LanguageToggle />
          <button type="button" className="btn-secondary" onClick={logout}>
            {t('auth.logout')}
          </button>
        </div>
      </header>

      <nav className="tabs">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => (isActive ? 'tab active' : 'tab')}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      {children}
    </div>
  )
}

export default PortalLayout

