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
  PanelLeft
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
      "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all rounded-xl mb-1 group",
      active 
        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]" 
        : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
    )}
  >
    <Icon className={cn("w-5 h-5 shrink-0", active ? "text-primary-foreground" : "group-hover:scale-110 transition-transform")} />
    {!collapsed && <span className="truncate">{label}</span>}
    {!collapsed && active && <ChevronRight className="w-4 h-4 ml-auto animate-in fade-in slide-in-from-left-2" />}
  </NavLink>
);

const PortalLayout = ({ title, subtitle, children }: PortalLayoutProps) => {
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

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Dynamic Sidebar */}
      <aside 
        className={cn(
          "glass-strong flex flex-col fixed h-full z-40 transition-all duration-300 ease-in-out border-r-0 border-l-0",
          isCollapsed ? "w-[72px]" : "w-[260px]",
          isRTL ? "right-0 border-l" : "left-0 border-r"
        )}
      >
        <div className="p-4 flex items-center justify-between overflow-hidden">
          <div className={cn("flex items-center gap-3 transition-opacity duration-300", isCollapsed ? "opacity-0 invisible w-0" : "opacity-100 visible w-auto")}>
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-black text-lg shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
              L
            </div>
            <span className="font-black text-lg tracking-tighter text-gradient">{t('common.appName')}</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="shrink-0 hover:bg-primary/10 hover:text-primary rounded-xl h-9 w-9"
          >
            {isCollapsed ? (isRTL ? <PanelLeftClose /> : <PanelLeft />) : (isRTL ? <PanelLeft /> : <PanelLeftClose />)}
          </Button>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto scrollbar-hide">
          {!isCollapsed && (
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 px-3 opacity-60">
              {t('common.main_menu')}
            </div>
          )}
          {menuItems.map((item) => (
            <SidebarItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              collapsed={isCollapsed}
              active={location.pathname === item.href}
            />
          ))}
        </nav>

        {/* AI Engine Info */}
        {!isCollapsed && (
          <div className="px-6 py-4 mx-3 mb-4 rounded-2xl bg-primary/5 border border-primary/10 glass">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-primary">AI Engine Active</span>
            </div>
            <p className="text-[9px] text-muted-foreground leading-tight">
               Powered by <span className="text-primary font-bold">BGE-M3</span> Embedding & <span className="text-primary font-bold">Qdrant</span> Vector DB.
            </p>
          </div>
        )}

        <div className="p-4 bg-muted/20 border-t border-border/40 mt-auto">
          <div className={cn("flex items-center gap-3 mb-4 transition-all duration-300", isCollapsed ? "justify-center" : "px-2")}>
            <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-black shadow-inner shrink-0">
              {user?.username?.[0].toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-2">
                <div className="text-sm font-black truncate leading-tight">{user?.username}</div>
                <div className="text-[9px] font-black text-primary/70 truncate uppercase tracking-tighter">{t(`roles.${user?.role}`)}</div>
              </div>
            )}
          </div>
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all",
              isCollapsed && "justify-center px-0"
            )}
            onClick={logout}
          >
            <LogOut className={cn("w-5 h-5", !isCollapsed && (isRTL ? "ml-3" : "mr-3"))} />
            {!isCollapsed && <span className="font-bold">{t('auth.logout')}</span>}
          </Button>
        </div>
      </aside>

      {/* Modern Main Content Area */}
      <main 
        className={cn(
          "flex-1 transition-all duration-300 min-h-screen",
          isCollapsed 
            ? (isRTL ? "mr-[72px]" : "ml-[72px]") 
            : (isRTL ? "mr-[260px]" : "ml-[260px]")
        )}
      >
        {/* Glass Header */}
        <header className="sticky top-0 z-30 w-full glass border-b px-8 py-4 flex justify-between items-center h-[72px]">
          <div className="animate-fade-in-up">
            <h1 className="text-2xl font-black tracking-tighter text-gradient leading-none">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground font-medium mt-1">
                {subtitle}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4 text-muted-foreground/60">
              <Search className="w-4 h-4 cursor-pointer hover:text-primary transition-colors hover:scale-110" />
              <Bell className="w-4 h-4 cursor-pointer hover:text-primary transition-colors hover:scale-110" />
              <Settings className="w-4 h-4 cursor-pointer hover:text-primary transition-colors hover:scale-110" />
            </div>
            <div className="flex items-center gap-3 border-l border-border/40 pl-6 h-8">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <div className="p-8 max-w-[1600px] mx-auto animate-fade-in-up">
          {children}
        </div>
      </main>
    </div>
  )
}

export default PortalLayout

