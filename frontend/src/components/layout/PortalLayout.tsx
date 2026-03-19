import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageToggle from '../LanguageToggle'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../../auth/useAuth'

interface PortalLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
}

const PortalLayout = ({ title, subtitle, children }: PortalLayoutProps) => {
  const { t } = useTranslation()
  const { user, logout } = useAuth()

  const getLinks = () => {
    switch (user?.role) {
      case 'clerk':
        return [
          { to: '/clerk/cases', label: t('clerk.nav.cases') },
          { to: '/clerk/documents', label: t('clerk.nav.documents') },
        ]
      case 'judge':
        return [{ to: '/judge/cases', label: t('judge.nav.cases') }]
      case 'admin':
        return [
          { to: '/admin/metrics', label: t('admin.nav.metrics') },
          { to: '/admin/users', label: t('admin.nav.users') },
          { to: '/admin/assignments', label: t('admin.nav.assignments') },
          { to: '/admin/audit', label: t('admin.nav.audit') },
        ]
      default:
        return []
    }
  }

  const links = getLinks()

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <div className="header-actions">
          <ThemeToggle />
          <LanguageToggle />
          <button type="button" className="btn btn-secondary" onClick={logout}>
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

