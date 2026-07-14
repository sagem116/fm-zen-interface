import type { ReactNode } from "react";

export function RecruitmentToolbar({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-3 sm:p-4">{children}</div>;
}
