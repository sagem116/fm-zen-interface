import type { ReactNode } from "react";

interface RecruitmentHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function RecruitmentHeader({ title, subtitle, actions }: RecruitmentHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground mt-1">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
