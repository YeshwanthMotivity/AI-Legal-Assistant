import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale } from 'lucide-react';

interface ComparisonData {
  field: string;
  currentValue: string | string[];
  precedentValue: string | string[];
}

interface CaseComparisonProps {
  currentCase: {
    title: string;
    type: string;
    facts: string;
    issues: string[];
    outcome: string;
    compensation: string;
  };
  precedentCase: {
    title: string;
    type: string;
    facts: string;
    issues: string[];
    outcome: string;
    compensation: string;
  };
}

const CaseComparison = ({ currentCase, precedentCase }: CaseComparisonProps) => {
  const { t, i18n } = useTranslation();

  const comparisonData: ComparisonData[] = [
    { field: t('judge.workspace.caseType') || 'Case Type', currentValue: currentCase.type, precedentValue: precedentCase.type },
    { field: t('judge.workspace.factComparison') || 'Key Facts', currentValue: currentCase.facts, precedentValue: precedentCase.facts },
    { field: t('judge.workspace.legalIssues') || 'Legal Issues', currentValue: currentCase.issues, precedentValue: precedentCase.issues },
    { field: t('judge.judgment.decision') || 'Decision Outcome', currentValue: currentCase.outcome, precedentValue: precedentCase.outcome },
    { field: t('judge.judgment.compensation') || 'Compensation/Award', currentValue: currentCase.compensation, precedentValue: precedentCase.compensation },
  ];

  return (
    <Card className="border-border/50 bg-background shadow-xl overflow-hidden rounded-3xl">
      <CardHeader className="py-5 border-b bg-muted/10">
        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
          <Scale className="w-5 h-5 text-primary" />
          {t('judge.workspace.caseComparison') || 'Case Comparison Analysis'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
              <TableHead className="w-1/4 font-black uppercase text-[10px] tracking-[0.2em] px-6 py-4 text-muted-foreground">{t('common.field') || 'Field'}</TableHead>
              <TableHead className="w-3/8 font-black uppercase text-[10px] tracking-[0.2em] px-6 py-4 text-primary">{t('judge.workspace.currentCase') || 'Current Case'}</TableHead>
              <TableHead className="w-3/8 font-black uppercase text-[10px] tracking-[0.2em] px-6 py-4 text-emerald-600">{t('judge.workspace.precedentCase') || 'Precedent Case'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisonData.map((row, idx) => (
              <TableRow key={idx} className="hover:bg-primary/[0.02] border-b border-border/30 transition-colors">
                <TableCell className="font-black text-[10px] uppercase text-muted-foreground/60 align-top pt-6 pb-6 px-6 tracking-wide">{row.field}</TableCell>
                <TableCell 
                  className="text-[12px] align-top pt-6 pb-6 px-6"
                  title={typeof row.currentValue === 'string' ? row.currentValue : undefined}
                >
                  {Array.isArray(row.currentValue) ? (
                    <div className="flex flex-wrap gap-1.5">
                      {row.currentValue.map((v, i) => (
                        <Badge key={i} variant="outline" className="text-[9px] px-2 py-0.5 border-primary/20 text-primary font-black bg-primary/5 uppercase tracking-tighter">{v}</Badge>
                      ))}
                      {row.currentValue.length === 0 && <span className="text-muted-foreground/50 italic font-medium">N/A</span>}
                    </div>
                  ) : (
                    <div className="leading-relaxed font-bold text-foreground/80 max-h-32 overflow-y-auto scrollbar-thin pr-2 relative">
                      {row.currentValue || <span className="text-muted-foreground/50 italic font-medium">N/A</span>}
                    </div>
                  )}
                </TableCell>
                <TableCell 
                  className="text-[12px] align-top pt-6 pb-6 px-6 bg-primary/[0.02]"
                  title={typeof row.precedentValue === 'string' ? row.precedentValue : undefined}
                >
                  {Array.isArray(row.precedentValue) ? (
                    <div className="flex flex-wrap gap-1.5">
                      {row.precedentValue.map((v, i) => (
                        <Badge key={i} variant="secondary" className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-black uppercase tracking-tighter">{v}</Badge>
                      ))}
                      {row.precedentValue.length === 0 && <span className="text-muted-foreground/50 italic font-medium">N/A</span>}
                    </div>
                  ) : (
                    <div className="leading-relaxed font-bold text-foreground/80 max-h-32 overflow-y-auto scrollbar-thin pr-2 relative">
                       {row.precedentValue || <span className="text-muted-foreground/50 italic font-medium">N/A</span>}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CaseComparison;
