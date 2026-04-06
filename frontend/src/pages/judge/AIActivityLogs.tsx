import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  ChevronLeft, 
  Activity, 
  Clock, 
  Database, 
  Layout, 
  RefreshCw 
} from 'lucide-react';
import PortalLayout from '../../components/layout/PortalLayout';
import apiClient from '../../api/client';

interface AuditLogEntry {
  id: string;
  case_id: string;
  phase_name: string;
  action: string;
  status: string;
  timestamp: string;
  details?: any;
}

export default function AIActivityLogs() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: logs, isLoading, isRefetching } = useQuery<AuditLogEntry[]>({
    queryKey: ['activity-logs', id],
    queryFn: () => apiClient.get(`/audit?case_id=${id}&limit=50`).then(r => r.data),
    refetchInterval: 5000,
    enabled: !!id,
  });

  return (
    <PortalLayout 
      title={t('judge.activityLogs.title', 'AI Activity Logs')} 
      subtitle={t('judge.activityLogs.subtitle', 'Real-time trace of judicial node operations')}
      headerActions={
        <button 
          onClick={() => navigate(`/judge/cases/${id}`)}
          className="flex items-center gap-2 h-9 px-4 text-[10px] font-bold bg-muted hover:bg-muted/80 rounded-lg transition-all uppercase tracking-widest"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> {t('common.back', 'Back to Case')}
        </button>
      }
    >
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
              {t('judge.activityLogs.liveFeed', 'System Audit Feed')}
            </h2>
          </div>
          {isRefetching && (
            <div className="flex items-center gap-2 text-[10px] font-bold text-primary animate-pulse uppercase tracking-widest">
              <RefreshCw className="w-3 h-3 animate-spin" /> {t('common.syncing', 'Syncing...')}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="p-12 text-center animate-pulse text-muted-foreground uppercase text-[10px] font-black tracking-[0.2em]">
              Fetching Node Telemetry...
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground bg-card rounded-2xl border border-dashed border-border/60 italic text-sm">
              No activity recorded for this judicial session yet.
            </div>
          ) : (
            <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {logs.map((log, index) => (
                <div key={log.id} className="relative flex items-center justify-between group animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="flex items-center gap-6">
                    {/* Status Indicator */}
                    <div className="relative flex items-center justify-center shrink-0">
                      <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center bg-background z-10 transition-colors ${
                        log.status === 'SUCCESS' ? 'border-emerald-500/50 text-emerald-600' : 
                        log.status === 'FAILURE' ? 'border-red-500/50 text-red-600' : 
                        'border-primary/50 text-primary'
                      }`}>
                        {log.phase_name.includes('Creation') ? <Layout className="w-4 h-4" /> : 
                         log.phase_name.includes('Evidence') ? <Database className="w-4 h-4" /> : 
                         <Activity className="w-4 h-4" />}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">{log.phase_name}</span>
                        <span className="text-xs font-bold text-foreground">{log.action}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                        <Clock className="w-3 h-3 opacity-40" />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${
                    log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : 
                    log.status === 'FAILURE' ? 'bg-red-500/10 text-red-700 border-red-500/20' : 
                    'bg-primary/10 text-primary border-primary/20'
                  }`}>
                    {log.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
