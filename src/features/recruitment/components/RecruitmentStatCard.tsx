import type { ComponentType } from "react";
import { RecruitmentCard } from "./RecruitmentCard";

interface RecruitmentStatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ComponentType<{ className?: string }>;
}

export function RecruitmentStatCard({ label, value, hint, icon: Icon }: RecruitmentStatCardProps) {
  return (
    <RecruitmentCard>
      <div className="text-center">
        {Icon ? <Icon className="mx-auto mb-1 size-4 text-gold" /> : null}
        <p className="text-xl font-semibold tabular-nums">{value}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
    </RecruitmentCard>
  );
}
