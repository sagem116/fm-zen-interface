import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RecruitmentGridProps {
  children: ReactNode;
  className?: string;
}

export function RecruitmentGrid({ children, className }: RecruitmentGridProps) {
  return <div className={cn("grid gap-4", className)}>{children}</div>;
}
