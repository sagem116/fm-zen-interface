import type { ReactNode } from "react";
import { AlertCircle, Target, Sparkles, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface NarrativeCardProps {
  title?: string;
  content: string | ReactNode;
  intent?: "insight" | "warning" | "success" | "neutral" | "recommendation";
  className?: string;
}

const intentConfig = {
  neutral: {
    icon: null,
    bg: "bg-muted/50",
    border: "border-border",
    text: "text-foreground",
    iconColor: "text-muted-foreground",
  },
  insight: {
    icon: Sparkles,
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-900 dark:text-blue-100",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  recommendation: {
    icon: Target,
    bg: "bg-gold/10",
    border: "border-gold/30",
    text: "text-foreground",
    iconColor: "text-gold",
  },
  success: {
    icon: Sparkles,
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    text: "text-green-900 dark:text-green-100",
    iconColor: "text-green-600 dark:text-green-400",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-900 dark:text-amber-100",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  danger: {
    icon: AlertCircle,
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-900 dark:text-red-100",
    iconColor: "text-red-600 dark:text-red-400",
  },
} as const;

export function NarrativeCard({
  title,
  content,
  intent = "neutral",
  className,
}: NarrativeCardProps & { intent?: keyof typeof intentConfig }) {
  const config = intentConfig[intent];
  const Icon = config.icon;

  return (
    <div className={cn("p-4 rounded-xl border relative overflow-hidden", config.bg, config.border, className)}>
      {/* Decorative background element for certain intents */}
      {(intent === "insight" || intent === "recommendation") && (
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-transparent to-current opacity-[0.03] rounded-full blur-2xl pointer-events-none" />
      )}
      
      <div className="flex gap-4 relative z-10">
        {Icon ? (
          <div className="shrink-0 mt-0.5">
            <Icon className={cn("size-5", config.iconColor)} />
          </div>
        ) : null}
        
        <div className="space-y-1.5 flex-1 min-w-0 flex flex-col justify-center">
          {title ? (
            <h4 className={cn("text-sm font-semibold tracking-tight", config.text)}>
              {title}
            </h4>
          ) : null}
          <div className={cn(
             "text-sm leading-relaxed", 
             intent === "neutral" ? "text-muted-foreground" : cn("opacity-90", config.text)
          )}>
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
