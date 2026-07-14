import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface RecruitmentEmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function RecruitmentEmptyState({
  title,
  description,
  icon,
  action,
}: RecruitmentEmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        {icon ? <div className="mb-3 flex justify-center">{icon}</div> : null}
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        {action ? <div className="mt-4">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
