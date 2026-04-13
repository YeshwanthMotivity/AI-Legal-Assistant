import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  ChevronLeft, 
  Activity, 
  Clock, 
  Database, 
  Layout, 
  RefreshCw,
  Cpu,
  ShieldCheck,
  Terminal,
  Layers
} from 'lucide-react';
import PortalLayout from '../../components/layout/PortalLayout';
import apiClient from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { Badge } from '@/components/ui/badge';

interface AuditLogEntry {
  id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  description?: string;
  created_at: string;
  extra_metadata?: {
    phase?: string;
    node?: string;
    model?: string;
    [key: string]: any;
  };
}

export default function AIActivityLogs() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: logs, isLoading, isRefetching } = useQuery<AuditLogEntry[]>({
    queryKey: ['activity-logs', id],
    queryFn: async () => {
      try {
        const r = await apiClient.get(`/audit?case_id=${id}&limit=100`);
        return r.data;
      } catch (err) {
        console.error('Audit fetch failed:', err);
        return [];
      }
    },
    refetchInterval: 5000,
    enabled: !!id,
  });

  const handleBack = () => {
    if (user?.role === 'clerk') {
      navigate(`/clerk/cases/${id}`);
    } else if (user?.role === 'admin') {
      navigate(`/admin/dashboard`);
    } else {
      navigate(`/judge/cases/${id}`);
    }
  };

  return (
    <PortalLayout 
      title={t('judge.activityLogs.title', 'AI Activity Logs')} 
      subtitle={t('judge.activityLogs.subtitle', 'Real-time trace of judicial node operations')}
      headerActions={
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 h-9 px-4 text-[10px] font-black bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 rounded-xl transition-all uppercase tracking-widest shadow-lg shadow-[var(--primary)]/20"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> {t('common.back', 'Back to Case')}
        </button>
      }
    >
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        {/* Header Info */}
        <div className="flex items-center justify-between bg-white/40 p-6 rounded-[2rem] border border-border/40 backdrop-blur-sm shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[var(--primary)]/10 rounded-[1.25rem]">
              <Cpu className="w-6 h-6 text-[var(--primary)]" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                {t('judge.activityLogs.liveFeed', 'System Audit Feed')}
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse shadow-[0_0_8px_var(--primary)]" />
              </h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Case ID: {id}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isRefetching && (
              <div className="flex items-center gap-2 text-[10px] font-black text-[var(--primary)] animate-pulse uppercase tracking-widest">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {t('common.syncing', 'Syncing...')}
              </div>
            )}
            <div className="h-8 w-[1px] bg-border/40 mx-2" />
            <div className="p-2 bg-[var(--primary)]/5 rounded-lg border border-[var(--primary)]/10 px-3">
              <span className="text-[9px] font-black text-[var(--primary)] uppercase tracking-widest">Monitoring Localized Nodes</span>
            </div>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="space-y-6 relative">
          {isLoading ? (
            <div className="p-20 text-center animate-pulse">
              <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-6 h-6 text-[var(--primary)] animate-bounce" />
              </div>
              <div className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em]">
                Acquiring Node Telemetry...
              </div>
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground bg-white/40 rounded-[2.5rem] border border-dashed border-border/60 shadow-inner">
              <div className="flex flex-col items-center gap-3">
                 <Terminal className="w-8 h-8 opacity-20" />
                 <p className="italic text-base font-medium opacity-60">
                   No activity recorded for this judicial session yet.
                 </p>
              </div>
            </div>
          ) : (
            <div className="relative space-y-6 before:absolute before:inset-0 before:ml-[2.25rem] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[var(--primary)]/0 before:via-border/60 before:to-[var(--primary)]/0 px-2 pb-12">
              {logs.map((log, index) => {
                const currentPhase = log.extra_metadata?.phase || 'General Operations';
                const prevPhase = index > 0 ? logs[index - 1].extra_metadata?.phase || 'General Operations' : null;
                const showDivider = currentPhase !== prevPhase;

                return (
                  <React.Fragment key={log.id}>
                    {showDivider && (
                      <div className="relative z-10 pt-10 pb-4 first:pt-0 group/divider">
                         <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-2xl bg-[var(--primary)] text-white flex items-center justify-center shadow-lg shadow-[var(--primary)]/20 border-2 border-white">
                               <Layers className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                               <span className="text-[9px] font-black text-[var(--primary)] uppercase tracking-[0.2em]">{t('common.phase', 'Operation Phase')}</span>
                               <h4 className="text-xs font-black uppercase text-foreground tracking-widest">{currentPhase.replace(/_/g, ' ')}</h4>
                            </div>
                            <div className="flex-1 h-[2px] bg-gradient-to-r from-border/60 to-transparent" />
                         </div>
                      </div>
                    )}
                    
                    <div 
                      className="relative flex items-start gap-8 group animate-in fade-in slide-in-from-bottom-4 duration-500" 
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Timeline Indicator */}
                      <div className="relative z-10 mt-1">
                        <div className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center bg-white shadow-lg transition-all 
                            ${log.action.includes('error') ? 'border-red-500/40 text-red-600' : 'border-[var(--primary)]/40 text-[var(--primary)]'} 
                            group-hover:scale-110 group-hover:rotate-3 duration-300`}>
                          {log.action.includes('create') || log.action.includes('start') ? <Layout className="w-5 h-5" /> : 
                           log.action.includes('document') || log.action.includes('upload') ? <Database className="w-5 h-5" /> : 
                           log.action.includes('analysis') ? <Activity className="w-5 h-5" /> :
                           <Cpu className="w-5 h-5" />}
                        </div>
                      </div>

                      {/* Log Content Card */}
                      <div className="flex-1 bg-white/50 hover:bg-white/80 border border-border/30 rounded-[1.5rem] p-5 transition-all shadow-sm hover:shadow-md group/card">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-[var(--primary)]/20 bg-[var(--primary)]/5 text-[var(--primary)] px-2 py-0.5">
                              {log.extra_metadata?.phase ? log.extra_metadata.phase.replace(/_/g, ' ') : (log.resource_type || 'System')}
                            </Badge>
                            <h3 className="text-sm font-black text-foreground uppercase tracking-tight capitalize">
                              {log.action.replace(/_/g, ' ')}
                            </h3>
                          </div>
                          
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-tighter opacity-50 bg-muted/30 px-2 py-1 rounded-lg">
                            <Clock className="w-3 h-3" />
                            {new Date(log.created_at).toLocaleString()}
                          </div>
                        </div>

                        {log.description && (
                          <p className="text-[11px] font-medium text-muted-foreground leading-relaxed pl-1 border-l-2 border-border/20 italic group-hover/card:border-[var(--primary)]/20 transition-colors">
                            {log.description}
                          </p>
                        )}

                        {log.extra_metadata && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {log.extra_metadata.node && (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/30 border border-border/40 text-[9px] font-bold text-muted-foreground uppercase">
                                <ShieldCheck className="w-2.5 h-2.5" />
                                Node: {log.extra_metadata.node}
                              </div>
                            )}
                            {log.extra_metadata.model && (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/30 border border-border/40 text-[9px] font-bold text-muted-foreground uppercase">
                                <Cpu className="w-2.5 h-2.5" />
                                Model: {log.extra_metadata.model}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}

