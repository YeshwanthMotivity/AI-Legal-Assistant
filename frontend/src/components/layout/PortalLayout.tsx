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
}

const SidebarItem = ({ icon: Icon, label, href, active, collapsed }: SidebarItemProps) => (
  <NavLink
    to={href}
    className={cn(
      "relative flex items-center gap-3 px-3 py-2 text-sm font-semibold transition-all rounded-xl mb-1 group overflow-hidden",
      collapsed && "justify-center px-2",
      active 
        ? "bg-white/10 text-sidebar-text shadow-xl border border-white/10 scale-[1.01]" 
        : "text-white/50 hover:bg-white/5 hover:text-sidebar-text border border-transparent"
    )}
    title={collapsed ? label : undefined}
  >
    {active && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-text-accent rounded-r-md transition-all duration-300 shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
    )}
    <Icon className={cn("w-5 h-5 shrink-0 transition-transform", active ? "text-sidebar-text" : "group-hover:scale-105 text-white/50 group-hover:text-sidebar-text/80")} />
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
  const sidebarWidth = isCollapsed ? 'w-[72px]' : 'w-[280px]'
  const mainMargin = isCollapsed
    ? (isRTL ? 'mr-[72px]' : 'ml-[72px]')
    : (isRTL ? 'mr-[280px]' : 'ml-[280px]')

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Collapsible Sidebar */}
      <aside 
        className={cn(
          "bg-sidebar text-sidebar-text flex flex-col fixed h-full z-40 border-r-0 border-l-0 shadow-2xl transition-all duration-300",
          sidebarWidth,
          isRTL ? "right-0 border-l border-[var(--border-color)]" : "left-0 border-r border-[var(--border-color)]"
        )}
      >
        <div className={cn("flex items-center gap-3 transition-all duration-300", isCollapsed ? "p-4 justify-center" : "p-6")}>
          <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-sidebar-text shadow-lg transition-transform hover:scale-105 active:scale-95 shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          {!isCollapsed && <span className="font-black text-xl tracking-tighter text-sidebar-text">{t('common.appName')}</span>}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn("p-2 rounded-lg hover:bg-white/10 text-sidebar-text transition-colors", isCollapsed ? "mx-auto mt-2" : "ml-auto")}
          >
            {isCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          {!isCollapsed && (
            <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] mb-4 px-3">
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
            />
          ))}
        </nav>

        {/* AI Engine Info Card — hidden when collapsed */}
        {!isCollapsed && (
          <div className="px-5 py-4 mx-3 mb-4 rounded-2xl bg-white/5 border border-white/5 relative group">
            <div className="flex items-center gap-2.5 mb-2">
               <div className="w-2 h-2 rounded-full bg-text-accent animate-pulse shadow-[0_0_10px_#D4AF37]" />
               <span className="text-[10px] font-black uppercase tracking-widest text-text-accent">{t('judge.judgment.aiReasoningNode')}</span>
            </div>
            <p className="text-[10px] text-white/50 leading-relaxed font-bold italic font-serif">
               {t('judge.judgment.aiReasoningDesc')}
            </p>
          </div>
        )}

        <div className={cn("bg-black/10 border-t border-[var(--border-color)] mt-auto", isCollapsed ? "p-3" : "p-5")}>
          <div className={cn("flex items-center mb-4", isCollapsed ? "justify-center" : "gap-4 px-2")}>
            <div className={cn(
              "rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-text-accent font-black shadow-inner shrink-0",
              isCollapsed ? "w-10 h-10 text-base" : "w-12 h-12 text-lg"
            )}>
              {user?.username?.[0].toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black truncate leading-tight text-white">{user?.username}</div>
                <div className="text-[10px] font-black text-text-accent/80 truncate uppercase tracking-tight">{t(`roles.${user?.role}`)}</div>
              </div>
            )}
          </div>
          <Button 
            variant="ghost" 
            className={cn(
              "w-full text-white/70 hover:text-white hover:bg-white/10 rounded-2xl transition-all group",
              isCollapsed ? "justify-center h-10 px-2" : "justify-start h-11 px-4"
            )}
            onClick={logout}
          >
            <LogOut className={cn("w-5 h-5 transition-transform group-hover:-translate-x-1", !isCollapsed && (isRTL ? "ml-3" : "mr-3"))} />
            {!isCollapsed && <span className="font-bold">{t('auth.logout')}</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        className={cn(
          "flex-1 transition-all duration-300 min-h-screen",
          mainMargin
        )}
      >
        {/* Header — expanded height for breathing room */}
        {!hideHeaderContent && (
          <header className="sticky top-0 z-30 w-full glass-strong border-b px-12 py-4 flex justify-between items-center h-[72px]">
            <div className="animate-in fade-in slide-in-from-top-2 duration-500">
              <h1 className="text-2xl font-black tracking-tighter text-gradient leading-none">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground font-bold mt-1 opacity-70 italic">
                  {subtitle}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 border-border/40 h-10">
                <LanguageToggle />
              </div>
            </div>
          </header>
        )}

        {/* Page Content Container - perfectly aligned with header px-12 */}
        <div className="px-12 py-10 max-w-[1640px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          {children}
        </div>
      </main>
    </div>
  )
}

export default PortalLayout
