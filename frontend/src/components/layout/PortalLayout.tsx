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
  title?: string
  subtitle?: string
  children: ReactNode
  hideHeaderContent?: boolean
  headerActions?: ReactNode
}

interface SidebarItemProps {
  icon: any;
  label: string;
  href: string;
  active?: boolean;
  collapsed?: boolean;
}

const SidebarItem = ({ icon: Icon, label, href, active, collapsed }: SidebarItemProps) => {
  const { i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'
  
  return (
    <NavLink
      to={href}
      className={cn(
        "relative flex items-center gap-3 px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all rounded-xl mb-1 group overflow-hidden",
        collapsed && "justify-center px-0 h-12 mb-2",
        active 
          ? "bg-white/10 text-white shadow-xl border border-white/10 scale-[1.02]" 
          : "text-white/40 hover:bg-white/5 hover:text-white/80 border border-transparent"
      )}
      title={collapsed ? label : undefined}
    >
      {active && (
        <div className={cn(
          "absolute top-1/2 -translate-y-1/2 w-1.5 h-1/2 bg-accent rounded-full transition-all duration-500 shadow-[0_0_15px_#D4AF37]",
          isRTL ? "right-0" : "left-0"
        )} />
      )}
      <Icon className={cn("w-5 h-5 shrink-0 transition-all duration-500", active ? "text-accent drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]" : "group-hover:scale-110 text-white/30 group-hover:text-white/60")} />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
}

const PortalLayout = ({ title, subtitle, children, hideHeaderContent, headerActions }: PortalLayoutProps) => {
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
          { icon: Gavel, label: t('clerk.nav.assignments', 'Case Assignment'), href: '/clerk/assignments' }
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
    <div 
      className="flex min-h-screen bg-background text-foreground selection:bg-primary/20"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Collapsible Sidebar */}
      <aside 
        className={cn(
          "bg-sidebar text-sidebar-text flex flex-col sticky top-0 h-screen z-50 shadow-2xl transition-all duration-300 shrink-0",
          sidebarWidth,
          isRTL ? "border-l border-white/5" : "border-r border-white/5"
        )}
      >
        <div className={cn("flex items-center transition-all duration-300 relative", isCollapsed ? "flex-col p-4 gap-4" : "p-6 gap-3")}>
          <div className={cn(
            "bg-white rounded-xl flex items-center justify-center text-primary shadow-lg transition-transform hover:scale-110 active:scale-95 shrink-0",
            isCollapsed ? "w-8 h-8" : "w-10 h-10"
          )}>
            <Scale className={cn("transition-all", isCollapsed ? "w-4 h-4" : "w-5 h-5")} />
          </div>
          {!isCollapsed && <span className="font-black text-xs tracking-widest text-sidebar-text whitespace-nowrap uppercase opacity-90">{t('common.appName')}</span>}
          
          {/* TAB-STYLE COLLAPSE BUTTON */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "absolute top-8 w-8 h-8 bg-primary border-2 border-white/10 rounded-full text-white shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:bg-primary-hover hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center",
              isRTL ? "-left-4" : "-right-4"
            )}
            title={isCollapsed ? t('common.expand') : t('common.collapse')}
          >
            {isCollapsed ? (isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />) : (isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />)}
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {!isCollapsed && (
            <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-6 px-3">
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
          <div className="px-5 py-5 mx-3 mb-6 rounded-2xl bg-white/5 border border-white/5 relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-125 transition-transform duration-1000">
               <Scale className="w-16 h-16 text-accent" />
            </div>
            <div className="flex items-center gap-2.5 mb-2.5 relative z-10">
               <div className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_12px_#D4AF37]" />
               <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent">{t('judge.judgment.aiReasoningNode')}</span>
            </div>
            <p className="text-[10px] text-white/40 leading-relaxed font-bold italic font-sans relative z-10">
               {t('judge.judgment.aiReasoningDesc')}
            </p>
          </div>
        )}

        <div className={cn("bg-white/5 border-t border-white/5 mt-auto flex flex-col items-center", isCollapsed ? "p-3 gap-3" : "p-5")}>
          <div className={cn("flex items-center", isCollapsed ? "justify-center w-full" : "gap-4 px-2 w-full")}>
            <div className={cn(
              "rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-accent font-black shadow-inner shrink-0",
              isCollapsed ? "w-10 h-10 text-base" : "w-12 h-12 text-lg"
            )}>
              {user?.username?.[0].toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black truncate leading-tight text-white">{user?.username}</div>
                <div className="text-[10px] font-black text-accent/80 truncate uppercase tracking-widest">{t(`roles.${user?.role}`)}</div>
              </div>
            )}
          </div>
          <Button 
            variant="ghost" 
            className={cn(
              "w-full text-white/50 hover:text-white hover:bg-white/10 rounded-2xl transition-all group flex items-center mt-4",
              isCollapsed ? "justify-center h-10 px-0" : "justify-start h-11 px-4"
            )}
            onClick={logout}
          >
            <LogOut className={cn("w-5 h-5 transition-transform group-hover:scale-110", !isCollapsed && (isRTL ? "ml-3" : "mr-3"))} />
            {!isCollapsed && <span className="font-bold text-xs uppercase tracking-widest">{t('auth.logout')}</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        className={cn(
          "flex-1 transition-all duration-300 min-h-screen relative flex flex-col min-w-0 bg-background",
          hideHeaderContent && "h-screen overflow-hidden"
        )}
      >
        {/* Header — expanded height for breathing room */}
        {!hideHeaderContent && (
          <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-xl border-b border-border/40 h-[72px] flex items-center">
            <div className="w-full max-w-[1640px] mx-auto px-8 flex justify-between items-center">
              <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                <h1 className="text-xs font-black tracking-[0.1em] text-primary uppercase leading-none">
                  {title || t('dashboard.title', 'Judicial Workspace')}
                </h1>
                {subtitle && (
                  <p className="text-[10px] text-muted-foreground font-bold mt-2 opacity-50 italic tracking-tight uppercase leading-none">
                    {subtitle}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-6">
                {headerActions && (
                  <div className={cn("flex items-center gap-3 h-8", isRTL ? "border-l border-border/40 pl-6" : "border-r border-border/40 pr-6")}>
                    {headerActions}
                  </div>
                )}
                <div className="flex items-center gap-4 h-10">
                  <LanguageToggle />
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Page Content Container - Unified Compact Baseline */}
        <div className={cn(
          "animate-in fade-in slide-in-from-bottom-4 duration-700 flex-1 h-full min-w-0",
          hideHeaderContent ? "p-0" : "px-8 pt-8 pb-10 max-w-[1640px] w-full mx-auto"
        )}>
          {children}
        </div>
      </main>
    </div>
  )
}

export default PortalLayout

