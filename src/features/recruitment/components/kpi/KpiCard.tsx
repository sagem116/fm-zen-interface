import type { ComponentType } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  intent?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const intentStyles = {
  default: "",
  success: "border-green-500/20 bg-green-500/5",
  warning: "border-amber-500/20 bg-amber-500/5",
  danger: "border-red-500/20 bg-red-500/5",
  info: "border-blue-500/20 bg-blue-500/5",
};

const textStyles = {
  default: "text-foreground",
  success: "text-green-600 dark:text-green-500",
  warning: "text-amber-600 dark:text-amber-500",
  danger: "text-red-600 dark:text-red-500",
  info: "text-blue-600 dark:text-blue-500",
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  trendValue,
  intent = "default",
  className,
}: KpiCardProps) {
  return (
    <Card className={cn("overflow-hidden flex flex-col justify-between", intentStyles[intent], className)}>
      <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full relative">
         <div className="flex justify-between items-start mb-2">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            {Icon ? <Icon className={cn("size-4 sm:size-5 opacity-70", textStyles[intent])} /> : null}
         </div>
         
         <div className="flex items-baseline gap-2">
           <p className={cn("text-2xl sm:text-3xl font-bold font-display tracking-tight tabular-nums", textStyles[intent])}>
             {value}
           </p>
           {trend && trendValue ? (
             <span className={cn(
               "text-xs font-medium ml-1",
               trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"
             )}>
               {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
             </span>
           ) : null}
         </div>

         {hint ? <p className="mt-2 text-[11px] sm:text-xs text-muted-foreground line-clamp-2 leading-snug">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
