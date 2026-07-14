import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

interface Props {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  action?: { label?: string; to: string; params?: Record<string, string> };
  children: ReactNode;
  compact?: boolean;
  className?: string;
}

export function DashboardCard({ title, icon: Icon, action, children, compact, className }: Props) {
  return (
    <Card className={className}>
      <CardHeader className={compact ? "pb-2" : "pb-3"}>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-display flex items-center gap-2 min-w-0">
            {Icon && <Icon className="size-4 text-gold shrink-0" />}
            <span className="truncate">{title}</span>
          </CardTitle>
          {action && (
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs shrink-0">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Link to={action.to as any} params={action.params as any} search={true}>
                {action.label ?? "Ver mais"} <ArrowRight className="size-3" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
