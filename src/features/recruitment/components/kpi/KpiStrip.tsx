import type { ReactNode } from "react";
import { RecruitmentCard } from "../RecruitmentCard";

interface KpiStripProps {
  children: ReactNode;
}

export function KpiStrip({ children }: KpiStripProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 mb-8">
      {children}
    </div>
  );
}
