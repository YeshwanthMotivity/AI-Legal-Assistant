import { ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Upload, 
  Briefcase, 
  Clock, 
  CheckCircle2,
  Settings,
  ArrowRight
} from 'lucide-react';
import PortalLayout from '../components/layout/PortalLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';

export default function ClerkDashboard(): ReactNode {
  const { user } = useAuth();

  return (
    <PortalLayout title="Clerk Dashboard" subtitle={`Welcome, ${user?.email || 'Legal Assistant'}`}>
      
      {/* Quick Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard label="Pending Uploads" value="12" icon={Upload} className="border-l-4 border-l-amber-500" />
        <StatCard label="Active Cases" value="48" icon={Briefcase} className="border-l-4 border-l-primary" />
        <StatCard label="Completed Tasks" value="124" icon={CheckCircle2} className="border-l-4 border-l-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Case Management Card */}
        <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow group">
           <CardHeader className="bg-muted/10 border-b py-6 px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                     <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Case Management</CardTitle>
                    <CardDescription className="text-xs font-medium uppercase tracking-wider mt-1 opacity-70">Document Control Center</CardDescription>
                  </div>
                </div>
                <Link to="/clerk/cases">
                   <Button variant="ghost" size="icon" className="group-hover:translate-x-1 transition-transform">
                      <ArrowRight className="w-5 h-5" />
                   </Button>
                </Link>
              </div>
           </CardHeader>
           <CardContent className="p-8">
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 italic">
                 Track and manage all judicial case documents. verify metadata, monitor processing status, and ensure data integrity for the judge's review.
              </p>
              <Link to="/clerk/cases">
                <Button className="w-full h-11 shadow-lg shadow-primary/20 gap-2">
                   Open Workspace
                </Button>
              </Link>
           </CardContent>
        </Card>

        {/* Document Upload Card */}
        <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow group">
           <CardHeader className="bg-muted/10 border-b py-6 px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
                     <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Direct Ingestion</CardTitle>
                    <CardDescription className="text-xs font-medium uppercase tracking-wider mt-1 opacity-70">Bulk Evidence Processing</CardDescription>
                  </div>
                </div>
                <Link to="/clerk/documents">
                   <Button variant="ghost" size="icon" className="group-hover:translate-x-1 transition-transform">
                      <ArrowRight className="w-5 h-5" />
                   </Button>
                </Link>
              </div>
           </CardHeader>
           <CardContent className="p-8">
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 italic">
                 Streamline the ingestion of physical evidence and legal filings. Supporting high-resolution OCR for both Arabic and English procedural documents.
              </p>
              <Link to="/clerk/documents">
                <Button variant="secondary" className="w-full h-11 border-emerald-500/20 text-emerald-700 bg-emerald-500/5 hover:bg-emerald-500/10 gap-2">
                   Start Bulk Upload
                </Button>
              </Link>
           </CardContent>
        </Card>
      </div>

      {/* System Status Banner */}
      <div className="mt-10 p-6 bg-card border rounded-2xl flex items-center justify-between shadow-sm">
         <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <div>
               <h4 className="text-sm font-bold tracking-tight">AI Reasoning Nodes: ONLINE</h4>
               <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none mt-0.5">Latency: 24ms | Model Cluster: JAIS-7B Optimized</p>
            </div>
         </div>
         <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground text-xs uppercase font-black hover:text-primary transition-colors">
            <Settings className="w-4 h-4" />
            Hardware Diagnostics
         </Button>
      </div>
    </PortalLayout>
  );
}
