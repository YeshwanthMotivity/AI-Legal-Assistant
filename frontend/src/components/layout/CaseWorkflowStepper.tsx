import React from 'react';
import { cn } from '@/lib/utils';
import { Check, FileText, UploadCloud, Brain, Scale, FileSignature } from 'lucide-react';

export interface CaseWorkflowStepperProps {
  status?: string;
  role: 'judge' | 'clerk';
  onStepClick?: (step: number) => void;
  compact?: boolean;
}

export default function CaseWorkflowStepper({ 
  status = 'Created', 
  role, 
  onStepClick,
  compact = false 
}: CaseWorkflowStepperProps) {
  
  // Status to Step mapping
  let currentStep = 1;
  let isAiPulsing = false;

  switch (status) {
    case 'Created':
      currentStep = 2;
      break;
    case 'DocumentsUploaded':
      currentStep = 3;
      break;
    case 'AIAnalysisPending':
      currentStep = 3;
      isAiPulsing = true;
      break;
    case 'AIAnalysisReady':
      currentStep = 4;
      break;
    case 'DraftGenerated':
      currentStep = 5;
      break;
    case 'Finalized':
      currentStep = 6;
      break;
    default:
      currentStep = 1;
  }

  const steps = [
    { id: 1, name: 'Case Creation', icon: FileText, actionableFor: ['clerk'] },
    { id: 2, name: 'Evidence Upload', icon: UploadCloud, actionableFor: ['clerk'] },
    { id: 3, name: 'AI Analysis', icon: Brain, actionableFor: [] }, // AI stage, no one acts
    { id: 4, name: 'Judicial Review', icon: Scale, actionableFor: ['judge'] },
    { id: 5, name: 'Final Judgment', icon: FileSignature, actionableFor: ['judge'] },
  ];

  return (
    <div className={cn("w-full", compact ? "py-2" : "py-6 px-2")}>
      <div className="relative flex items-center justify-between">
        {/* Background tracking line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted rounded-full" />
        
        {/* Active progress line up to current step */}
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full transition-all duration-500 ease-in-out"
          style={{ width: `${Math.min(100, Math.max(0, (currentStep - 1) / 4 * 100))}%` }}
        />

        {steps.map((step, idx) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isFuture = currentStep < step.id;
          const isActionable = step.actionableFor.includes(role);
          const isAiProcessing = step.id === 3 && isAiPulsing;
          
          // An actionable active step gets a blue glow
          const hasGlow = isCurrent && isActionable;
          const isClickable = !!onStepClick;

          const Icon = isCompleted && !isAiProcessing ? Check : step.icon;

          return (
            <div 
              key={step.id} 
              className={cn(
                "relative flex flex-col items-center z-10 transition-all",
                isClickable ? "cursor-pointer group" : ""
              )}
              onClick={() => isClickable && onStepClick(step.id)}
            >
              {/* Icon Bubble */}
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 backdrop-blur-md",
                  compact ? "w-8 h-8 text-xs" : "",
                  isCompleted ? "bg-primary text-primary-foreground border-primary" : 
                  isCurrent ? "bg-card border-primary text-primary shadow-lg" : 
                  "bg-muted/30 border-muted text-muted-foreground",
                  hasGlow ? "shadow-[0_0_15px_rgba(37,99,235,0.4)] ring-4 ring-primary/20" : "",
                  isAiProcessing ? "animate-pulse ring-4 ring-tertiary/20 border-tertiary text-tertiary" : "",
                  isClickable && isFuture ? "group-hover:border-primary/50 group-hover:bg-primary/5" : ""
                )}
              >
                <Icon className={cn(compact ? "w-4 h-4" : "w-5 h-5")} />
              </div>

              {/* Label */}
              {!compact && (
                <div className={cn(
                  "absolute top-12 text-center w-32 -mx-11",
                  isCurrent || isCompleted ? "text-foreground" : "text-muted-foreground"
                )}>
                  <p className="text-xs font-semibold tracking-tight">{step.name}</p>
                  {isActionable && isCurrent && (
                    <span className="text-[9px] font-bold uppercase tracking-widest text-primary mt-1 block">
                      Awaiting Action
                    </span>
                  )}
                  {isAiProcessing && (
                    <span className="text-[9px] font-bold uppercase tracking-widest text-tertiary mt-1 block animate-pulse">
                      Processing...
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
