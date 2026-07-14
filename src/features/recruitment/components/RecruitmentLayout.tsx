import type { ReactNode } from "react";
import { RecruitmentBreadcrumb } from "./RecruitmentBreadcrumb";
import { RecruitmentHeader } from "./RecruitmentHeader";
import { RecruitmentToolbar } from "./RecruitmentToolbar";
import { RecruitmentEmptyState } from "./RecruitmentEmptyState";
import type { RecruitmentBreadcrumbItem } from "../utils/recruitment-breadcrumbs";

interface RecruitmentLayoutProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: RecruitmentBreadcrumbItem[];
  headerActions?: ReactNode;
  toolbar?: ReactNode;
  isLoading?: boolean;
  emptyState?: { title: string; description: string; icon?: ReactNode; action?: ReactNode };
  leftPanel?: ReactNode;
  rightPanel?: ReactNode;
  children: ReactNode;
}

export function RecruitmentLayout({
  title,
  subtitle,
  breadcrumbs,
  headerActions,
  toolbar,
  isLoading,
  emptyState,
  leftPanel,
  rightPanel,
  children,
}: RecruitmentLayoutProps) {
  return (
    <div className="space-y-6">
      {breadcrumbs?.length ? <RecruitmentBreadcrumb items={breadcrumbs} /> : null}

      <RecruitmentHeader title={title} subtitle={subtitle} actions={headerActions} />

      {toolbar ? <RecruitmentToolbar>{toolbar}</RecruitmentToolbar> : null}

      {isLoading ? (
        <RecruitmentEmptyState
          title="A carregar"
          description="A preparar o conteudo de recrutamento..."
        />
      ) : emptyState ? (
        <RecruitmentEmptyState
          title={emptyState.title}
          description={emptyState.description}
          icon={emptyState.icon}
          action={emptyState.action}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_minmax(0,320px)]">
          <div className="space-y-4">
            {leftPanel}
            {children}
          </div>
          {rightPanel ? <aside className="space-y-4">{rightPanel}</aside> : null}
        </div>
      )}
    </div>
  );
}
