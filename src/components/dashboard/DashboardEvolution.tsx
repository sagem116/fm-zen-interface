import { LineChart } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { EvolutionChart, type EvoSeries } from "@/components/EvolutionChart";
import type { RankingEntry } from "@/lib/fm-rankings";

function toSeries(
  entries: RankingEntry[],
  evo: Record<string, Record<number, number>>,
  years: number[],
  topN = 5,
): EvoSeries[] {
  return entries.slice(0, topN).map((e) => ({
    name: e.name,
    data: years.map((y) => ({
      year: y,
      weighted: evo[e.name]?.[y] ?? 0,
      raw: evo[e.name]?.[y] ?? 0,
      positionWeighted: null,
      positionRaw: null,
    })),
  }));
}

interface Props {
  clubs: RankingEntry[];
  coaches: RankingEntry[];
  countries: RankingEntry[];
  evolution: {
    clubs: Record<string, Record<number, number>>;
    coaches: Record<string, Record<number, number>>;
    countries: Record<string, Record<number, number>>;
  };
  years: number[];
}

export function DashboardEvolution({ clubs, coaches, countries, evolution, years }: Props) {
  return (
    <DashboardCard title="Evolução" icon={LineChart} action={{ to: "/rankings" }}>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Top 5 Clubes
          </p>
          <EvolutionChart series={toSeries(clubs, evolution.clubs, years)} showModeToggle={false} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Top 5 Treinadores
          </p>
          <EvolutionChart
            series={toSeries(coaches, evolution.coaches, years)}
            showModeToggle={false}
          />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Top 5 Países
          </p>
          <EvolutionChart
            series={toSeries(countries, evolution.countries, years)}
            showModeToggle={false}
          />
        </div>
      </div>
    </DashboardCard>
  );
}
