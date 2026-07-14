import { RecruitmentHeader } from "../RecruitmentHeader";
import { RecruitmentBreadcrumb } from "../RecruitmentBreadcrumb";
import type { RecruitmentBreadcrumbItem } from "../../utils/recruitment-breadcrumbs";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users } from "lucide-react";

interface HeroHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: RecruitmentBreadcrumbItem[];
  actions?: ReactNode;
  lastUpdate?: string;
  analyzedCount?: number | string;
  activeFiltersCount?: number;
}

export function HeroHeader({
  title,
  description,
  breadcrumbs,
  actions,
  lastUpdate,
  analyzedCount,
  activeFiltersCount,
}: HeroHeaderProps) {
  return (
    <div className="mb-8 space-y-4">
      {breadcrumbs?.length ? <RecruitmentBreadcrumb items={breadcrumbs} /> : null}
      
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b pb-6 border-border/40">
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-foreground">{title}</h1>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
             {description ? <p>{description}</p> : null}
             
             <div className="flex items-center gap-3">
                {lastUpdate ? (
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <Calendar className="size-3.5" />
                    <span className="text-xs">Atualizado a {lastUpdate}</span>
                  </div>
                ) : null}
                
                {analyzedCount !== undefined ? (
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <Users className="size-3.5" />
                    <span className="text-xs">{analyzedCount} analisados</span>
                  </div>
                ) : null}
                
                {activeFiltersCount !== undefined && activeFiltersCount > 0 ? (
                  <Badge variant="secondary" className="ml-1 text-[10px] uppercase font-bold py-0 h-5">
                    {activeFiltersCount} {activeFiltersCount === 1 ? 'filtro' : 'filtros'}
                  </Badge>
                ) : null}
             </div>
          </div>
        </div>
        
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
