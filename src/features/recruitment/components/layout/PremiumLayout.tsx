import type { ReactNode } from "react";
import { HeroHeader } from "./HeroHeader";
import type { RecruitmentBreadcrumbItem } from "../../utils/recruitment-breadcrumbs";
import { RecruitmentEmptyState } from "../RecruitmentEmptyState";
import { RecruitmentToolbar } from "../RecruitmentToolbar";

interface PremiumLayoutProps {
  title: string;
  description?: string;
  breadcrumbs?: RecruitmentBreadcrumbItem[];
  headerActions?: ReactNode;
  toolbar?: ReactNode;
  
  // Hero metadata
  lastUpdate?: string;
  analyzedCount?: number | string;
  activeFiltersCount?: number;

  isLoading?: boolean;
  emptyState?: { title: string; description: string; icon?: ReactNode; action?: ReactNode };
  
  // Pre-content slot (useful for KPI strip)
  kpiStrip?: ReactNode;
  
  // Layout Options
  leftPanel?: ReactNode;
  rightPanel?: ReactNode;
  
  children: ReactNode;
}

export function PremiumLayout({
  title,
  description,
  breadcrumbs,
  headerActions,
  toolbar,
  lastUpdate,
  analyzedCount,
  activeFiltersCount,
  isLoading,
  emptyState,
  kpiStrip,
  leftPanel,
  rightPanel,
  children,
}: PremiumLayoutProps) {
  const mainContent = (
    <div className="space-y-8">
      {leftPanel ? <div className="mb-6">{leftPanel}</div> : null}
      {children}
    </div>
  );

  return (
    <div className="space-y-0 relative focus-visible:outline-none">
      <HeroHeader 
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        actions={headerActions}
        lastUpdate={lastUpdate}
        analyzedCount={analyzedCount}
        activeFiltersCount={activeFiltersCount}
      />

      {toolbar ? (
        <div className="mb-6">
          <RecruitmentToolbar>{toolbar}</RecruitmentToolbar>
        </div>
      ) : null}

      {kpiStrip ? (
        <div className="mb-8">
          {kpiStrip}
        </div>
      ) : null}

      {isLoading ? (
        <RecruitmentEmptyState
          title="A carregar"
          description="A preparar a área de recrutamento..."
        />
      ) : emptyState ? (
        <RecruitmentEmptyState
          title={emptyState.title}
          description={emptyState.description}
          icon={emptyState.icon}
          action={emptyState.action}
        />
      ) : (
        rightPanel ? (
          <div className="grid gap-6 xl:grid-cols-[1fr_minmax(0,340px)]">
            {mainContent}
            <aside className="space-y-6">{rightPanel}</aside>
          </div>
        ) : (
          mainContent
        )
      )}
    </div>
  );
}
