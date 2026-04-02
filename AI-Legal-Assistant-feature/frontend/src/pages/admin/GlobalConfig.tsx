import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Settings, 
  Cpu, 
  Search, 
  Globe, 
  Save, 
  RefreshCcw,
  Sliders,
  Database,
  Shield,
  CheckCircle
} from 'lucide-react';
import PortalLayout from '../../components/layout/PortalLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function GlobalConfig(): ReactNode {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  
  // Local state for configuration parameters
  const [config, setConfig] = useState({
    model: 'qwen-2.5',
    reranker: 'cross-encoder',
    ragLimit: 5,
    similarityThreshold: 0.75,
    defaultLanguage: 'en',
    autoAnalyze: true
  });

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      alert("System configuration updated successfully!");
    }, 1000);
  };

  return (
    <PortalLayout title="Global Engine Configuration" subtitle="Adjust RAG parameters, model weights, and system-wide settings">
      
      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* AI Model Selection */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-primary/5 border-b">
              <div className="flex items-center gap-3">
                <Cpu className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Inference Engine</CardTitle>
                  <CardDescription>Select the primary LLM for judicial reasoning</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <div 
                  className={cn(
                    "p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between",
                    config.model === 'qwen-2.5' ? "bg-primary/5 border-primary shadow-sm" : "hover:bg-muted/50"
                  )}
                  onClick={() => setConfig({...config, model: 'qwen-2.5'})}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center font-bold", config.model === 'qwen-2.5' ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>Q</div>
                    <div>
                      <p className="font-bold text-sm">QWEN-2.5 (Recommended)</p>
                      <p className="text-xs text-muted-foreground">Specialized for Arabic & UAE Legal Contexts</p>
                    </div>
                  </div>
                  {config.model === 'qwen-2.5' && <div className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-[10px]">✓</div>}
                </div>
                
                <div 
                  className={cn(
                    "p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between",
                    config.model === 'qwen-7b' ? "bg-primary/5 border-primary shadow-sm" : "hover:bg-muted/50"
                  )}
                  onClick={() => setConfig({...config, model: 'qwen-7b'})}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center font-bold", config.model === 'qwen-7b' ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>Q</div>
                    <div>
                      <p className="font-bold text-sm">Qwen-14B-Chat</p>
                      <p className="text-xs text-muted-foreground">High performance for multilingual drafting</p>
                    </div>
                  </div>
                  {config.model === 'qwen-7b' && <div className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-[10px]">✓</div>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RAG Parameters */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-amber-500/5 border-b border-amber-500/10">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-amber-600" />
                <div>
                  <CardTitle className="text-lg">RAG & Retrieval Settings</CardTitle>
                  <CardDescription>Optimize precedent and law searches</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black uppercase text-muted-foreground tracking-tighter">Similarity Threshold</label>
                  <span className="text-xs font-black text-amber-600 bg-amber-600/10 px-2 py-0.5 rounded-full">{Math.round(config.similarityThreshold * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="0.95" 
                  step="0.05"
                  value={config.similarityThreshold}
                  onChange={(e) => setConfig({...config, similarityThreshold: parseFloat(e.target.value)})}
                  className="w-full h-1.5 bg-accent rounded-full appearance-none cursor-pointer accent-amber-600"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black uppercase text-muted-foreground tracking-tighter">Max Retrieval Count</label>
                  <span className="text-xs font-black text-amber-600 bg-amber-600/10 px-2 py-0.5 rounded-full">{config.ragLimit} Results</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="20" 
                  step="1"
                  value={config.ragLimit}
                  onChange={(e) => setConfig({...config, ragLimit: parseInt(e.target.value)})}
                  className="w-full h-1.5 bg-accent rounded-full appearance-none cursor-pointer accent-amber-600"
                />
              </div>

              <div className="p-4 bg-muted/20 border-l-4 border-l-amber-500 rounded-lg">
                <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                  Higher threshold increases precision but may return fewer results. Recommended: 0.70 - 0.80.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Localization & General */}
          <Card className="shadow-sm border-border/50 lg:col-span-2">
            <CardHeader className="bg-indigo-500/5 border-b border-indigo-500/10">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-indigo-600" />
                <div>
                  <CardTitle className="text-lg">Global System Defaults</CardTitle>
                  <CardDescription>Language and automation preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    Default Workspace Language
                  </label>
                  <div className="flex bg-accent/20 p-1.5 rounded-2xl border w-full max-w-sm gap-2 mt-4 ml-1">
                    <Button 
                      variant={config.defaultLanguage === 'en' ? 'default' : 'ghost'} 
                      className={`flex-1 rounded-xl h-11 transition-all ${config.defaultLanguage === 'en' ? 'shadow-md border border-primary/20' : ''}`}
                      onClick={() => setConfig({...config, defaultLanguage: 'en'})}
                    >
                      English (UK)
                      {config.defaultLanguage === 'en' && <CheckCircle className="ml-2 w-4 h-4" />}
                    </Button>
                    <Button 
                      variant={config.defaultLanguage === 'ar' ? 'default' : 'ghost'} 
                      className={`flex-1 rounded-xl h-11 transition-all ${config.defaultLanguage === 'ar' ? 'shadow-md border border-primary/20' : ''}`}
                      onClick={() => setConfig({...config, defaultLanguage: 'ar'})}
                    >
                      Arabic (العربية)
                      {config.defaultLanguage === 'ar' && <CheckCircle className="ml-2 w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                    <Database className="w-3.5 h-3.5" />
                    Automated Background Processing
                  </label>
                  <div className="flex items-center justify-between p-3 border rounded-xl bg-card">
                    <div>
                      <p className="text-sm font-bold">Auto-Analyze on Upload</p>
                      <p className="text-xs text-muted-foreground italic">Start AI reasoning immediately after clerk data entry</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={config.autoAnalyze}
                      onChange={(e) => setConfig({...config, autoAnalyze: e.target.checked})}
                      className="w-5 h-5 accent-primary" 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center p-6 bg-muted/20 border rounded-3xl">
          <div className="flex items-center gap-3 text-muted-foreground">
            <RefreshCcw className="w-4 h-4" />
            <span className="text-xs italic">Changes affect all active JUDGE and CLERK workspaces globally.</span>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" className="font-bold">Reset to Defaults</Button>
            <Button 
              className="px-10 h-12 shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-xs gap-2"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
