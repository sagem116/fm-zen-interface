import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ContentBlockProps {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: "default" | "highlight" | "danger" | "ghost";
}

const variantStyles = {
  default: "bg-card border-border",
  highlight: "bg-gold/5 border-gold/20",
  danger: "bg-red-500/5 border-red-500/20",
  ghost: "bg-transparent border-transparent shadow-none",
};

export function ContentBlock({
  title,
  description,
  action,
  children,
  icon,
  className,
  contentClassName,
  variant = "default",
}: ContentBlockProps) {
  return (
    <Card className={cn("overflow-hidden group", variantStyles[variant], className)}>
      {(title || description || action || icon) ? (
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-3">
            {icon ? (
              <div className={cn(
                "p-2 rounded-md shrink-0", 
                variant === "highlight" ? "bg-gold/20 text-gold" : "bg-primary/10 text-primary"
              )}>
                {icon}
              </div>
            ) : null}
            <div className="space-y-1">
              {title ? <CardTitle className="text-lg tracking-tight font-display">{title}</CardTitle> : null}
              {description ? (
                <CardDescription className="text-xs max-w-[800px] leading-relaxed">
                  {description}
                </CardDescription>
              ) : null}
            </div>
          </div>
          {action ? <div className="shrink-0 ml-4">{action}</div> : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn("p-5 sm:p-6", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
