import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  BarChart3, 
  ShieldAlert, 
  Settings, 
  Activity,
  ArrowRight,
  Database,
  Lock,
  Sparkles,
  Zap,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { motion } from 'framer-motion';
import PortalLayout from '../components/layout/PortalLayout';

export default function AdminDashboard(): ReactNode {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Mock heatmap data for "Goated" OS look
  const heatmapData = Array.from({ length: 48 }, (_, i) => ({
    id: i,
    load: Math.floor(Math.random() * 100),
  }));

  return (
    <PortalLayout title={t('admin.dashboard.title')} subtitle={t('admin.dashboard.subtitle', { email: user?.email || 'Admin' })}>
      
      {/* 1. Goated System Health Overview */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
        {[
          { label: t('admin.dashboard.totalUsers'), value: "1,284", icon: Users, color: 'text-text-accent' },
          { label: t('admin.dashboard.systemUptime'), value: "99.9%", icon: Activity, color: 'text-success' },
          { label: t('admin.dashboard.databaseLoad'), value: "14%", icon: Database, color: 'text-text-heading' },
          { label: t('admin.dashboard.securityAlerts'), value: "0", icon: ShieldAlert, color: 'text-danger' }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-goated p-10 rounded-[3rem] border border-white/5 relative overflow-hidden group shadow-2xl"
          >
            <div className="relative z-10">
              <p className="text-[10px] font-black text-text-accent uppercase tracking-[0.4em] mb-4 opacity-70 group-hover:opacity-100 transition-opacity">{stat.label}</p>
              <h3 className={`font-headline text-5xl font-bold ${stat.color} tracking-tighter mb-4`}>{stat.value}</h3>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-secondary">
                <stat.icon className="w-4 h-4" />
                <span>Synchronized</span>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <stat.icon className="w-24 h-24" />
            </div>
          </motion.div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left: Functional Modules (8/12) */}
        <div className="lg:col-span-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* User Access Card */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="glass-goated p-10 rounded-[3.5rem] border border-white/5 space-y-8 shadow-xl group cursor-pointer"
            >
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-6">
                    <div className="p-5 bg-text-accent/10 text-text-accent rounded-2xl group-hover:bg-text-accent group-hover:text-bg-base transition-all duration-500">
                       <Users className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-headline text-2xl font-bold text-text-heading italic">{t('admin.dashboard.userAccess')}</h4>
                      <p className="text-[10px] font-black text-text-accent uppercase tracking-[0.3em] opacity-60">IAM Controller</p>
                    </div>
                 </div>
                 <div className="p-3 bg-white/5 rounded-full group-hover:translate-x-2 transition-transform">
                    <ArrowRight className="w-5 h-5 text-text-accent" />
                 </div>
               </div>
               <p className="text-sm text-text-secondary font-medium leading-relaxed font-serif italic opacity-80 border-l-2 border-text-accent/30 pl-5">
                  {t('admin.dashboard.userAccessDesc')}
               </p>
               <button onClick={() => navigate('/admin/users')} className="w-full py-5 btn-royal-shine rounded-[2rem] text-bg-base font-black uppercase tracking-[0.4em] text-[11px] shadow-lg">
                  {t('admin.dashboard.manageAccess')}
               </button>
            </motion.div>

            {/* AI Performance Card */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="glass-goated p-10 rounded-[3.5rem] border border-white/5 space-y-8 shadow-xl group cursor-pointer"
            >
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-6">
                    <div className="p-5 bg-success/10 text-success rounded-2xl group-hover:bg-success group-hover:text-bg-base transition-all duration-500">
                       <Sparkles className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-headline text-2xl font-bold text-text-heading italic">{t('admin.dashboard.aiPerformance')}</h4>
                      <p className="text-[10px] font-black text-success uppercase tracking-[0.3em] opacity-60">Neural Monitor</p>
                    </div>
                 </div>
                 <div className="p-3 bg-white/5 rounded-full group-hover:translate-x-2 transition-transform">
                    <ArrowRight className="w-5 h-5 text-success" />
                 </div>
               </div>
               <p className="text-sm text-text-secondary font-medium leading-relaxed font-serif italic opacity-80 border-l-2 border-success/30 pl-5">
                  {t('admin.dashboard.aiPerfDesc')}
               </p>
               <button onClick={() => navigate('/admin/metrics')} className="w-full py-5 bg-success/10 border border-success/20 text-success hover:bg-success group-hover:text-bg-base transition-all duration-500 rounded-[2rem] font-black uppercase tracking-[0.4em] text-[11px] shadow-lg">
                  {t('admin.dashboard.viewAnalytics')}
               </button>
            </motion.div>
          </div>

          {/* Audit Logs Banner */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="p-12 glass-goated rounded-[4rem] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 group"
          >
            <div className="flex items-center gap-8">
              <div className="p-6 bg-danger/10 text-danger rounded-[2rem] group-hover:scale-110 transition-transform">
                <Lock className="w-12 h-12" />
              </div>
              <div>
                <h4 className="text-[11px] font-black text-danger uppercase tracking-[0.5em] mb-2">{t('admin.dashboard.securityAudit')}</h4>
                <p className="font-headline text-3xl font-bold text-text-heading italic leading-tight">{t('admin.dashboard.complianceLedger', 'Synchronized Regulatory Ledger')}</p>
                <p className="text-sm text-text-secondary mt-2 opacity-60 font-serif italic">{t('admin.dashboard.auditDesc')}</p>
              </div>
            </div>
            <button onClick={() => navigate('/admin/audit')} className="px-10 py-5 btn-royal-shine rounded-[2rem] text-bg-base font-black uppercase tracking-[0.4em] text-[11px] h-fit whitespace-nowrap">
              {t('admin.dashboard.reviewLogs')}
            </button>
          </motion.div>
        </div>

        {/* Right: Dashboard Heatmap (4/12) */}
        <div className="lg:col-span-4 space-y-10">
          <motion.section 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-goated p-10 rounded-[3.5rem] border border-white/5 h-full space-y-8"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-headline text-2xl font-bold text-text-heading tracking-tight flex items-center gap-4">
                <Cpu className="w-6 h-6 text-text-accent animate-pulse" /> Cluster Load
              </h4>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-ping" />
                <span className="text-[9px] font-black text-success uppercase tracking-widest">Optimized</span>
              </div>
            </div>

            {/* Visual Heatmap Placeholder */}
            <div className="grid grid-cols-6 gap-2 pt-4">
              {heatmapData.map((tile) => (
                <div 
                  key={tile.id} 
                  className="aspect-square rounded-lg transition-colors duration-1000 border border-white/5"
                  style={{ 
                    backgroundColor: tile.load > 85 ? '#EF4444' : tile.load > 60 ? '#D4AF37' : '#10B981',
                    opacity: 0.1 + (tile.load / 150)
                  }}
                />
              ))}
            </div>

            <div className="space-y-6 pt-10 border-t border-white/5">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-text-muted">
                <span>Kernel Sync</span>
                <span className="text-text-accent font-bold">100%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 2 }} className="h-full bg-text-accent" />
              </div>
              
              <div className="flex items-center gap-4 p-5 rounded-[2rem] bg-white/5 border border-white/5">
                <ShieldCheck className="w-6 h-6 text-success" />
                <div>
                  <p className="text-[10px] font-black text-success uppercase tracking-[0.2em] mb-0.5">Sovereign Guard</p>
                  <p className="text-[11px] text-text-secondary font-medium italic">All perimeters established and secure.</p>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </div>

      {/* Global Config Section */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-16 p-12 glass-goated rounded-[4rem] border border-white/10 relative overflow-hidden flex flex-col items-center text-center group"
      >
        <div className="p-8 bg-text-accent/10 border border-text-accent/20 rounded-[2.5rem] mb-8 group-hover:scale-110 transition-transform duration-700">
           <Settings className="w-16 h-16 text-text-accent" />
        </div>
        <h4 className="text-4xl font-headline font-bold text-text-heading tracking-tight mb-4">{t('admin.dashboard.globalConfig')}</h4>
        <p className="text-md text-text-secondary font-medium italic mb-10 max-w-2xl mx-auto border-x border-text-accent/20 px-10">
          {t('admin.dashboard.globalConfigDesc')}
        </p>
        <button 
          className="px-16 py-6 btn-royal-shine rounded-[2.5rem] text-bg-base font-black uppercase tracking-[0.5em] text-[12px] shadow-2xl active:scale-95 transition-all"
          onClick={() => navigate('/admin/config')}
        >
          {t('admin.dashboard.enterConfigMode')}
        </button>
        <div className="absolute inset-0 bg-text-accent opacity-0 group-hover:opacity-[0.02] transition-opacity duration-1000 blur-3xl pointer-events-none" />
      </motion.div>
    </PortalLayout>
  );
}
