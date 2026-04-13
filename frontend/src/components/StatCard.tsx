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
 compact?: boolean;
}

const StatCard = ({ label, value, icon: Icon, trend, className, compact }: StatCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="h-full"
    >
      <div className={cn(
        "imperial-card h-full overflow-hidden flex flex-col group",
        compact ? "p-4" : "p-8",
        className
      )}>
        <div className={cn("flex items-center justify-between", compact ? "mb-4" : "mb-8")}>
          <div className={cn(
            "rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500 shadow-inner border border-primary/10",
            compact ? "w-10 h-10" : "w-16 h-16"
          )}>
            <Icon className={cn(compact ? "w-5 h-5" : "w-7 h-7")}/>
          </div>
          {trend && (
            <div className={cn(
              "text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-sm",
              trend.isPositive ? "bg-emerald-50 text-primary border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
            )}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}%
            </div>
          )}
        </div>
        <div className="mt-auto">
          <div className={cn("font-black tracking-tighter text-foreground leading-none tabular-nums", compact ? "text-2xl" : "text-4xl")}>
            {value}
          </div>
          <div className={cn("text-muted-foreground font-black uppercase tracking-[0.3em] mt-3 opacity-40", compact ? "text-[8px]" : "text-[10px]")}>
            {label}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
