import { Sparkles } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import type { Insight } from "@/lib/insights";

const SEASON_TYPES = new Set([
  "rankings.new_leader",
  "rankings.biggest_rise",
  "rankings.biggest_fall",
  "rankings.enter_top10",
  "rankings.exit_top10",
  "records.*",
  "competitions.national_dominance",
  "competitions.continental_dominance",
  "competitions.global_dominance",
  "trends.emerging_club",
  "trends.emerging_league",
  "trends.rising_country",
]);

function matches(type: string) {
  if (SEASON_TYPES.has(type)) return true;
  const [prefix] = type.split(".");
  return SEASON_TYPES.has(`${prefix}.*`);
}

export function DashboardSeasonSummary({ insights }: { insights: Insight[] }) {
  const items = insights.filter((i) => matches(i.type)).slice(0, 6);
  return (
    <DashboardCard
      title="Resumo da Época"
      icon={Sparkles}
      action={{ to: "/insights", label: "Ver todos" }}
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Sem eventos relevantes desta época.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((i) => (
            <li key={i.id} className="border-b border-border/40 last:border-0 pb-2 last:pb-0">
              <p className="font-medium text-sm">{i.title}</p>
              <p className="text-xs text-muted-foreground">{i.description}</p>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
