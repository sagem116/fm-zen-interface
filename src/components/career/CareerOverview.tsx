import { Trophy, Target, Goal, Shield, Percent, Award } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { useCareerStatistics, useCareerTrophies } from "@/lib/career/hooks";

export function CareerOverview() {
  const { statistics } = useCareerStatistics();
  const { trophies } = useCareerTrophies();

  const s = statistics;
  const matches = s?.matches ?? 0;
  const winPct = matches ? Math.round(((s?.wins ?? 0) / matches) * 100) : 0;
  const goalsDiff = (s?.goalsFor ?? 0) - (s?.goalsAgainst ?? 0);

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <StatCard icon={Target} label="Jogos" value={matches} />
      <StatCard icon={Award} label="Vitórias" value={s?.wins ?? 0} />
      <StatCard icon={Percent} label="V %" value={`${winPct}%`} />
      <StatCard
        icon={Goal}
        label="Golos +/-"
        value={goalsDiff >= 0 ? `+${goalsDiff}` : `${goalsDiff}`}
      />
      <StatCard icon={Trophy} label="Títulos" value={s?.titles ?? trophies.length} />
      <StatCard icon={Shield} label="Pontos" value={s?.points ?? 0} />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: number | string;
}) {
  return (
    <DashboardCard title={label} icon={Icon} compact>
      <div className="text-2xl font-display font-bold text-foreground">{value}</div>
    </DashboardCard>
  );
}
