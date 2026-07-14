import { Database } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

export interface KPIData {
  clubs: number;
  players: number;
  coaches: number;
  competitions: number;
  countries: number;
  seasons: number;
  imports?: number;
  activeProfileId?: string | null;
  activeRankingName?: string | null;
  insightsCount?: number;
}

export function DashboardKPIs({ kpis }: { kpis: KPIData }) {
  const items = [
    { label: "Épocas", value: kpis.seasons },
    { label: "Clubes", value: kpis.clubs },
    { label: "Jogadores", value: kpis.players },
    { label: "Treinadores", value: kpis.coaches },
    { label: "Competições", value: kpis.competitions },
    { label: "Países", value: kpis.countries },
    { label: "Imports", value: kpis.imports ?? 0 },
    { label: "Insights", value: kpis.insightsCount ?? 0 },
  ];
  return (
    <DashboardCard title="KPIs Gerais" icon={Database} compact>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {items.map((i) => (
          <div key={i.label} className="text-center">
            <p className="text-2xl font-bold tabular-nums gold-shimmer">
              {i.value.toLocaleString("pt-PT")}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
              {i.label}
            </p>
          </div>
        ))}
      </div>
      {(kpis.activeProfileId || kpis.activeRankingName) && (
        <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {kpis.activeRankingName && (
            <span>
              Ranking ativo:{" "}
              <span className="text-foreground font-medium">{kpis.activeRankingName}</span>
            </span>
          )}
          {kpis.activeProfileId && (
            <span>
              Perfil ativo:{" "}
              <span className="text-foreground font-medium">{kpis.activeProfileId}</span>
            </span>
          )}
        </div>
      )}
    </DashboardCard>
  );
}
