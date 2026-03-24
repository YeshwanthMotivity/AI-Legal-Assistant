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
    { field: i18n.language === 'ar' ? 'نوع القضية (Case Type)' : 'Case Type', currentValue: currentCase.type, precedentValue: precedentCase.type },
    { field: t('judge.workspace.factComparison'), currentValue: currentCase.facts, precedentValue: precedentCase.facts },
    { field: t('judge.workspace.legalIssues'), currentValue: currentCase.issues, precedentValue: precedentCase.issues },
    { field: t('judge.judgment.decision'), currentValue: currentCase.outcome, precedentValue: precedentCase.outcome },
    { field: t('judge.judgment.compensation'), currentValue: currentCase.compensation, precedentValue: precedentCase.compensation },
  ];

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden">
      <CardHeader className="py-4 border-b bg-card">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          {t('judge.workspace.caseComparison')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-1/4 font-bold uppercase text-[10px] tracking-widest">{t('common.field') || 'Field'}</TableHead>
              <TableHead className="w-3/8 font-bold uppercase text-[10px] tracking-widest text-primary">{t('judge.workspace.currentCase')}</TableHead>
              <TableHead className="w-3/8 font-bold uppercase text-[10px] tracking-widest text-indigo-600">{t('judge.workspace.precedentCase')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisonData.map((row, idx) => (
              <TableRow key={idx} className="hover:bg-accent/10 border-b border-border/50">
                <TableCell className="font-semibold text-[11px] text-muted-foreground align-top pt-4">{row.field}</TableCell>
                <TableCell className="text-[12px] align-top pt-4 pb-4">
                  {Array.isArray(row.currentValue) ? (
                    <div className="flex flex-wrap gap-1">
                      {row.currentValue.map((v, i) => (
                        <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 border-primary/20 text-primary font-bold">{v}</Badge>
                      ))}
                      {row.currentValue.length === 0 && <span className="text-muted-foreground italic">N/A</span>}
                    </div>
                  ) : (
                    <p className="leading-relaxed font-medium">{row.currentValue || 'N/A'}</p>
                  )}
                </TableCell>
                <TableCell className="text-[12px] align-top pt-4 pb-4 bg-indigo-50/20">
                  {Array.isArray(row.precedentValue) ? (
                    <div className="flex flex-wrap gap-1">
                      {row.precedentValue.map((v, i) => (
                        <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0 bg-indigo-100 text-indigo-700 border-indigo-200 font-bold">{v}</Badge>
                      ))}
                      {row.precedentValue.length === 0 && <span className="text-muted-foreground italic">N/A</span>}
                    </div>
                  ) : (
                    <p className="leading-relaxed text-muted-foreground italic">{row.precedentValue || 'N/A'}</p>
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
