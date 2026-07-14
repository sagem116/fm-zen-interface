import { Construction } from "lucide-react";
import type { ReactNode } from "react";
import { RecruitmentEmptyState } from "./RecruitmentEmptyState";

interface RecruitmentPlaceholderProps {
  title?: string;
  description: string;
  action?: ReactNode;
}

export function RecruitmentPlaceholder({
  title = "Em desenvolvimento",
  description,
  action,
}: RecruitmentPlaceholderProps) {
  return (
    <RecruitmentEmptyState
      title={title}
      description={description}
      icon={<Construction className="size-5 text-amber-500" />}
      action={action}
    />
  );
}
