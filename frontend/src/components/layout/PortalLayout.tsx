import { ReactNode, useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  History, 
  LogOut,
  ChevronRight,
  ChevronLeft,
  Gavel,
  FileText,
  ShieldCheck,
  Search,
  Settings,
  Bell,
  PanelLeftClose,
  PanelLeft,
  Scale
} from 'lucide-react'
import { cn } from '@/lib/utils'
import LanguageToggle from '../LanguageToggle'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

interface PortalLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
  hideHeaderContent?: boolean
}

interface SidebarItemProps {
  icon: any;
  label: string;
  href: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ icon: Icon, label, href, active, collapsed, onClick }: SidebarItemProps) => (
  <NavLink
    to={href}
    onClick={onClick}
    className={cn(
      "relative flex items-center gap-3 py-3 text-sm font-bold transition-all rounded-xl mb-1 group overflow-hidden px-4",
      collapsed ? "justify-center px-0" : "",
      active 
        ? "bg-white/10 text-white shadow-sm border border-white/10 scale-[1.02]" 
        : "text-white/60 hover:bg-white/5 hover:text-white border border-transparent"
    )}
    title={collapsed ? label : undefined}
  >
    {active && (
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-r-md transition-all duration-300 shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
    )}
    <Icon className={cn("shrink-0", collapsed ? "w-6 h-6" : "w-5 h-5", active ? "text-accent" : "group-hover:scale-105 transition-transform text-white/40 group-hover:text-accent/80")} />
    {!collapsed && <span className="truncate">{label}</span>}
  </NavLink>
);

const PortalLayout = ({ title, subtitle, children, hideHeaderContent }: PortalLayoutProps) => {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    return saved === 'true'
  })

  const isRTL = i18n.language === 'ar'

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed))
  }, [isCollapsed])

  const getMenuItems = () => {
    switch (user?.role) {
      case 'clerk':
        return [
          { icon: LayoutDashboard, label: t('nav.dashboard'), href: '/clerk/dashboard' },
          { icon: Briefcase, label: t('clerk.nav.cases'), href: '/clerk/cases' },
          { icon: FileText, label: t('clerk.nav.documents'), href: '/clerk/documents' },
        ]
      case 'judge':
        return [
          { icon: LayoutDashboard, label: t('nav.dashboard'), href: '/judge/dashboard' },
          { icon: Gavel, label: t('judge.nav.cases'), href: '/judge/cases' }
        ]
      case 'admin':
        return [
          { icon: LayoutDashboard, label: t('nav.dashboard'), href: '/admin/dashboard' },
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

  const handleNavClick = (label: string) => {
    if (label === t('nav.dashboard') || label === t('judge.nav.cases') || label === t('clerk.nav.cases')) {
      setIsCollapsed(true);
    }
  }

  return (
    <div className="flex min-h-screen bg-bg-base text-text-primary selection:bg-primary/20">
      {/* Static Sidebar */}
      <aside 
        className={cn(
          "bg-bg-sidebar flex flex-col fixed h-full z-40 transition-all duration-300 border-r-0 border-l-0 shadow-royal",
          isCollapsed ? "w-[80px]" : "w-[280px]",
          isRTL ? "right-0 border-l" : "left-0 border-r"
        )}
      >
        <div className={cn("p-6 flex items-center mb-2", isCollapsed ? "justify-center" : "gap-3")}>
          <div className="w-10 h-10 shrink-0 bg-primary-royal rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
            <Scale className="w-6 h-6" />
          </div>
          {!isCollapsed && <span className="font-black text-xl tracking-tighter text-gradient truncate">{t('common.appName')}</span>}
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto scrollbar-hide">
          {!isCollapsed && (
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] mb-4 px-4 opacity-50">
              {t('common.main_menu')}
            </div>
          )}
          {menuItems.map((item) => (
            <SidebarItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              active={location.pathname === item.href}
              collapsed={isCollapsed}
              onClick={() => handleNavClick(item.label)}
            />
          ))}
        </nav>

        {/* AI Engine Info Card (Static) */}
        {!isCollapsed && (
          <div className="px-6 py-5 mx-4 mb-8 rounded-2xl bg-bg-base/5 border border-border-subtle shadow-inner">
            <div className="flex items-center gap-2.5 mb-3">
               <div className="w-2 h-2 rounded-full bg-text-accent animate-pulse shadow-[0_0_8px_var(--accent-gold)]" />
               <span className="text-[9px] font-black uppercase tracking-widest text-text-accent truncate">{t('judge.judgment.aiReasoningNode')}</span>
            </div>
            <p className="text-[10px] text-sidebar-text opacity-50 leading-relaxed font-bold italic">
               {t('judge.judgment.aiReasoningDesc')}
            </p>
          </div>
        )}

        <div className={cn("bg-muted/20 border-t border-border/40 mt-auto", isCollapsed ? "p-4" : "p-6")}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-4 mb-6 px-2">
                <div className="w-12 h-12 rounded-2xl bg-bg-base/10 border border-border-subtle flex items-center justify-center text-text-accent font-black shadow-inner shrink-0 text-lg">
                  {user?.username?.[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-black truncate leading-tight text-sidebar-text">{user?.username}</div>
                  <div className="text-[10px] font-black text-text-accent/70 truncate uppercase tracking-tight">{t(`roles.${user?.role}`)}</div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-2xl h-12 transition-all group px-4"
                onClick={logout}
              >
                <LogOut className={cn("w-5 h-5 transition-transform group-hover:-translate-x-1", isRTL ? "ml-3" : "mr-3")} />
                <span className="font-bold">{t('auth.logout')}</span>
              </Button>
            </>
          ) : (
            <Button 
              variant="ghost" 
              className="w-full justify-center text-destructive hover:text-destructive hover:bg-destructive/10 rounded-2xl h-12 transition-all p-0"
              onClick={logout}
              title={t('auth.logout')}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        className={cn(
          "flex-1 transition-all duration-300 min-h-screen",
          isRTL ? (isCollapsed ? "mr-[80px]" : "mr-[280px]") : (isCollapsed ? "ml-[80px]" : "ml-[280px]")
        )}
      >
        {/* Header Enhancement */}
        {!hideHeaderContent && (
          <header className="sticky top-0 z-30 w-full glass-strong border-b border-border-subtle px-10 py-5 flex justify-between items-center h-[88px]">
            <div className="flex items-center gap-6 animate-in fade-in slide-in-from-top-2 duration-500">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-muted-foreground hover:text-primary rounded-xl"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
              </Button>
              <div>
                <h1 className="text-3xl font-headline font-bold tracking-tight text-primary leading-none">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs text-muted-foreground font-bold mt-1.5 opacity-70 italic">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-4 border-border/40 h-10">
                <ThemeToggle />
                <LanguageToggle />
              </div>
            </div>
          </header>
        )}

        {/* Page Content Container */}
        <div className="p-10 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          {children}
        </div>
      </main>
    </div>
  )
}

export default PortalLayout


