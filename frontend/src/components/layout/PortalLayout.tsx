import { ReactNode, useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  History, 
  LogOut,
  Gavel,
  FileText,
  ShieldCheck,
  PanelLeftClose,
  PanelLeft,
  Scale,
  Bell,
  Search,
  Sparkles
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import LanguageToggle from '../LanguageToggle'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../ui/button'

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
      "relative flex items-center gap-4 py-4 text-sm font-black transition-all duration-300 rounded-[1.5rem] mb-2 group overflow-hidden px-5",
      collapsed ? "justify-center px-0" : "",
      active 
        ? "bg-white/10 text-white shadow-2xl border border-white/20 scale-[1.02]" 
        : "text-white/50 hover:bg-white/5 hover:text-white border border-transparent"
    )}
    title={collapsed ? label : undefined}
  >
    {active && (
      <motion.div 
        layoutId="sidebar-active-indicator"
        className="absolute left-0 top-2 bottom-2 w-1.5 bg-text-accent rounded-r-full shadow-[0_0_15px_rgba(212,175,55,0.6)]" 
      />
    )}
    <Icon className={cn("shrink-0 transition-all duration-300", collapsed ? "w-7 h-7" : "w-5 h-5", active ? "text-text-accent" : "group-hover:scale-110 text-white/40 group-hover:text-text-accent/80")} />
    {!collapsed && <span className={cn("truncate tracking-wide", active ? "opacity-100" : "opacity-80")}>{label}</span>}
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

  return (
    <div className="flex min-h-screen bg-bg-base text-text-primary selection:bg-text-accent/20 font-sans antialiased overflow-x-hidden">
      
      {/* Goated OS Sidebar */}
      <aside 
        className={cn(
          "glass-goated flex flex-col fixed h-[calc(100vh-2rem)] m-4 z-50 transition-all duration-500 ease-in-out border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.3)] rounded-[3rem] overflow-hidden",
          isCollapsed ? "w-[100px]" : "w-[300px]",
          isRTL ? "right-0" : "left-0"
        )}
      >
        {/* Brand Section */}
        <div className={cn("p-8 flex items-center mb-6", isCollapsed ? "justify-center" : "gap-4")}>
          <motion.div 
            whileHover={{ rotate: 15, scale: 1.1 }}
            className="w-12 h-12 shrink-0 bg-gradient-to-br from-text-accent to-[#C9A227] rounded-2xl flex items-center justify-center text-bg-base shadow-2xl"
          >
            <Scale className="w-7 h-7" />
          </motion.div>
          {!isCollapsed && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <span className="font-headline text-2xl font-black tracking-tighter text-text-heading block leading-none">LexAI</span>
              <span className="text-[10px] font-black text-text-accent uppercase tracking-[0.4em] block mt-1">Sovereign OS</span>
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-5 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          {!isCollapsed && (
            <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em] mb-6 px-5 italic border-l border-white/10 ml-2">
              {t('common.main_menu')}
            </div>
          )}
          {menuItems.map((item, idx) => (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 + 0.2 }}
            >
              <SidebarItem
                icon={item.icon}
                label={item.label}
                href={item.href}
                active={location.pathname === item.href}
                collapsed={isCollapsed}
              />
            </motion.div>
          ))}
        </nav>

        {/* Global Intelligence Card (Goated) */}
        {!isCollapsed && (
           <motion.div 
             initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
             className="px-6 py-6 mx-5 mb-8 rounded-[2rem] bg-white/5 border border-white/5 shadow-inner relative group cursor-help"
           >
             <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 rounded-full bg-text-accent animate-pulse shadow-[0_0_10px_#D4AF37]" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-text-accent">{t('common.ai_engine')} Status</span>
             </div>
             <p className="text-[10px] text-white/50 leading-relaxed font-bold italic font-serif">
                Kernel Integrity: 100%<br />
                Neural Latency: 142ms
             </p>
             <div className="absolute inset-0 bg-text-accent opacity-0 group-hover:opacity-[0.03] transition-opacity duration-700 blur-2xl" />
           </motion.div>
        )}

        {/* User Module */}
        <div className={cn("bg-white/5 border-t border-white/10 mt-auto p-6 transition-all duration-300", isCollapsed ? "items-center" : "")}>
          {!isCollapsed ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4 px-2">
                <div className="relative">
                  <div className="w-14 h-14 rounded-3xl bg-white/10 border border-white/10 flex items-center justify-center text-text-accent font-black text-xl shadow-2xl relative z-10">
                    {user?.username?.[0].toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-[#0A1F16] z-20" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-md font-bold truncate text-text-heading tracking-tight">{user?.username}</div>
                  <div className="text-[10px] font-black text-text-accent/60 truncate uppercase tracking-[0.2em]">{t(`roles.${user?.role}`)}</div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-white/50 hover:text-white hover:bg-white/10 rounded-[1.5rem] h-14 group px-5 transition-all duration-300"
                onClick={logout}
              >
                <LogOut className={cn("w-5 h-5 transition-transform group-hover:-translate-x-1 mr-4")} />
                <span className="font-black uppercase tracking-[0.3em] text-[10px]">{t('auth.logout')}</span>
              </Button>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              className="w-full justify-center text-white/50 hover:bg-white/10 rounded-2xl h-14 transition-all"
              onClick={logout}
              title={t('auth.logout')}
            >
              <LogOut className="w-6 h-6" />
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        className={cn(
          "flex-1 transition-all duration-500 ease-in-out min-h-screen",
          isRTL ? (isCollapsed ? "mr-[100px]" : "mr-[300px]") : (isCollapsed ? "ml-[100px]" : "ml-[300px]")
        )}
      >
        {/* Goated Header */}
        {!hideHeaderContent && (
          <header className="sticky top-0 z-40 w-full glass-goated border-b border-white/5 px-12 py-6 flex justify-between items-center h-[100px]">
            <div className="flex items-center gap-10">
              <motion.button
                whileHover={{ rotate: 180, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="h-12 w-12 text-white/40 hover:text-text-accent rounded-[1.2rem] bg-white/5 border border-white/10 flex items-center justify-center transition-all"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? <PanelLeft className="w-6 h-6" /> : <PanelLeftClose className="w-6 h-6" />}
              </motion.button>
              <div>
                <motion.h1 
                  layoutId="page-title"
                  className="text-4xl font-headline font-bold tracking-tight text-text-heading leading-none italic"
                >
                  {title}
                </motion.h1>
                {subtitle && (
                  <p className="text-[11px] text-text-muted font-black mt-2 opacity-50 uppercase tracking-[0.3em]">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-10">
              <div className="hidden xl:flex items-center gap-6 px-10 border-x border-white/10 h-12">
                 <div className="flex flex-col text-right">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{t('common.ai_engine')}</span>
                    <span className="text-sm font-bold text-success italic leading-none mt-1">Sovereign v4</span>
                 </div>
                 <div className="w-10 h-10 rounded-[1.2rem] bg-success/5 border border-success/20 flex items-center justify-center text-success">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                 </div>
              </div>
              <div className="flex items-center gap-6">
                <ThemeToggle />
                <LanguageToggle />
              </div>
            </div>
          </header>
        )}

        {/* Page Content Container */}
        <div className="p-12 max-w-[1600px] mx-auto min-h-[calc(100vh-100px)]">
           <AnimatePresence mode="wait">
             <motion.div
               key={location.pathname}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               transition={{ duration: 0.5, ease: "easeOut" }}
             >
               {children}
             </motion.div>
           </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

export default PortalLayout
