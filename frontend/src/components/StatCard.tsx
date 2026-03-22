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
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Icon className="w-6 h-6" />
            </div>
            {trend && (
              <div className={cn(
                "text-xs font-bold px-2 py-1 rounded-full",
                trend.isPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              )}>
                {trend.isPositive ? '+' : '-'}{trend.value}%
              </div>
            )}
          </div>
          <div>
            <div className="text-3xl font-bold mb-1">{value}</div>
            <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
              {label}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default StatCard;
