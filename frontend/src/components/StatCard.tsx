import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface StatCardProps {
 label: string;
 value: string | number;
 icon: React.ElementType;
 trend?: {
 value: number;
 isPositive: boolean;
 };
 className?: string;
}

const StatCard = ({ label, value, icon: Icon, trend, className }: StatCardProps) => {
 return (
 <motion.div
 whileHover={{ y: -5 }}
 transition={{ duration: 0.2 }}
 >
 <Card className={cn("overflow-hidden border-border/50 shadow-md hover:shadow-xl hover:border-primary/30 transition-all duration-300 group", className)}>
  <CardContent className="p-8">
  <div className="flex items-center justify-between mb-6">
  <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] group-hover:scale-110 transition-transform duration-500 shadow-inner border border-[var(--primary)]/10">
  <Icon className="w-6 h-6"/>
  </div>
  {trend && (
  <div className={cn(
  "text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-sm",
  trend.isPositive ?"bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20":"bg-rose-500/10 text-rose-600 border border-rose-500/20"
  )}>
  {trend.isPositive ? '↑' : '↓'} {trend.value}%
  </div>
  )}
  </div>
  <div className="space-y-1">
  <div className="text-4xl font-black tracking-tighter text-foreground leading-none">{value}</div>
  <div className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.25em] opacity-60">
  {label}
  </div>
  </div>
  </CardContent>
 </Card>
 </motion.div>
 );
};

export default StatCard;
