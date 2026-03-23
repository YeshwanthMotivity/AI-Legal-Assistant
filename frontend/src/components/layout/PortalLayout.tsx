import { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  History, 
  LogOut,
  ChevronRight,
  Gavel,
  FileText,
  ShieldCheck,
  Search,
  Settings,
  Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'
import LanguageToggle from '../LanguageToggle'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../ui/button'

interface PortalLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
}

interface SidebarItemProps {
  icon: any;
  label: string;
  href: string;
  active?: boolean;
}

const SidebarItem = ({ icon: Icon, label, href, active }: SidebarItemProps) => (
  <NavLink
    to={href}
    className={cn(
      "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all rounded-lg mb-1",
      active 
        ? "bg-primary text-primary-foreground shadow-md" 
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    )}
  >
    <Icon className="w-5 h-5" />
    <span>{label}</span>
    {active && <ChevronRight className="w-4 h-4 ml-auto" />}
  </NavLink>
);

const PortalLayout = ({ title, subtitle, children }: PortalLayoutProps) => {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const location = useLocation()

  const getMenuItems = () => {
    switch (user?.role) {
      case 'clerk':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', href: '/clerk/dashboard' },
          { icon: Briefcase, label: t('clerk.nav.cases'), href: '/clerk/cases' },
          { icon: FileText, label: t('clerk.nav.documents'), href: '/clerk/documents' },
        ]
      case 'judge':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', href: '/judge/dashboard' },
          { icon: Gavel, label: t('judge.nav.cases'), href: '/judge/cases' }
        ]
      case 'admin':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
          { icon: ShieldCheck, label: t('admin.nav.metrics'), href: '/admin/metrics' },
          { icon: Users, label: t('admin.nav.users'), href: '/admin/users' },
          { icon: Briefcase, label: t('admin.nav.assignments'), href: '/admin/assignments' },
          { icon: History, label: t('admin.nav.audit'), href: '/admin/audit' },
        ]
      default:
        return []
    }
  }

  const menuItems = getMenuItems()

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 ltr:border-r rtl:border-l bg-card flex flex-col fixed h-full ltr:left-0 rtl:right-0 z-30 shadow-sm transition-all duration-300">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-xl shadow-lg">
            L
          </div>
          <span className="font-bold text-xl tracking-tight">{t('common.appName')}</span>
        </div>

        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-4">
            {t('common.main_menu')}
          </div>
          {menuItems.map((item) => (
            <SidebarItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              active={location.pathname === item.href}
            />
          ))}
        </nav>

        <div className="p-4 border-t bg-accent/30 mt-auto">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {user?.username?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{user?.username}</div>
              <div className="text-xs text-muted-foreground truncate uppercase">{t(`roles.${user?.role}`)}</div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={logout}
          >
            <LogOut className="w-5 h-5 ltr:mr-3 rtl:ml-3" />
            {t('auth.logout')}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ltr:pl-64 rtl:pr-64 transition-all duration-300 min-h-screen">
        <div className="p-8 max-w-7xl mx-auto">
          <header className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1">
                {title}
              </h1>
              {subtitle && (
                <p className="text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 ltr:mr-4 rtl:ml-4">
                <Search className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
                <Bell className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
                <Settings className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
              </div>
              <div className="flex items-center gap-2 border-l ltr:pl-4 rtl:pr-4">
                <ThemeToggle />
                <LanguageToggle />
              </div>
            </div>
          </header>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

export default PortalLayout

