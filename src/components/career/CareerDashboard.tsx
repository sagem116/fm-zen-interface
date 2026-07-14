import {
  Target,
  Trophy,
  Goal,
  Shield,
  Percent,
  Award,
  Activity,
  TrendingUp,
  CalendarRange,
  Users,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { useCareerAchievements, useCareerStatistics, useCareerTrophies } from "@/lib/career/hooks";
import { useCareerImportData } from "@/lib/career/hooks/useCareerImportData";
import { fmtNum } from "@/lib/fmt";

export function CareerDashboard() {
  const { statistics } = useCareerStatistics();
  const { trophies } = useCareerTrophies();
  const { achievements } = useCareerAchievements();
  const { seasons, playersBySeason } = useCareerImportData();
  const s = statistics;
  const m = s?.matches ?? 0;
  const wins = s?.wins ?? 0;
  const draws = s?.draws ?? 0;
  const losses = s?.losses ?? 0;
  const gf = s?.goalsFor ?? 0;
  const ga = s?.goalsAgainst ?? 0;
  const winPct = m ? Math.round((wins / m) * 100) : 0;

  const importedSeasonCount = seasons.filter((row) => row.imported).length;
  const importedPlayersCount = Object.values(playersBySeason).reduce((acc, list) => acc + list.length, 0);
  const avgImpact = importedPlayersCount
    ? Object.values(playersBySeason)
        .flat()
        .reduce((acc, player) => acc + player.goals + player.assists, 0) / importedPlayersCount
    : 0;

  const seasonTrend = seasons.map((row) => {
    const seasonPlayers = playersBySeason[row.year] ?? [];
    const impact = seasonPlayers.reduce((acc, p) => acc + p.goals + p.assists, 0);
    return {
      year: row.year,
      impact,
      clubs: row.imported?.clubs.length ?? (row.localSeason ? 1 : 0),
      comps: row.imported?.competitions.length ?? 0,
    };
  });

  const bestSeason = [...seasonTrend].sort((a, b) => b.impact - a.impact)[0];
  const latestSeason = seasonTrend[seasonTrend.length - 1];

  const narrative =
    seasonTrend.length === 0
      ? "Associa o treinador para gerar um resumo automático da evolução da carreira."
      : `De ${seasonTrend[0]?.year} a ${latestSeason?.year}, a carreira consolidou ${trophies.length} título(s) e ${achievements.length} conquista(s). O pico de impacto ofensivo surgiu em ${bestSeason?.year}, com ${fmtNum(bestSeason?.impact ?? 0)} ações decisivas (golos + assistências).`;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        <DashboardCard title="Jogos" icon={Target} compact>
          <Big>{m}</Big>
        </DashboardCard>
        <DashboardCard title="Vitórias" icon={Award} compact>
          <Big>{wins}</Big>
        </DashboardCard>
        <DashboardCard title="Empates" icon={Activity} compact>
          <Big>{draws}</Big>
        </DashboardCard>
        <DashboardCard title="Derrotas" icon={Activity} compact>
          <Big>{losses}</Big>
        </DashboardCard>
        <DashboardCard title="Golos marcados" icon={Goal} compact>
          <Big>{gf}</Big>
        </DashboardCard>
        <DashboardCard title="Golos sofridos" icon={Shield} compact>
          <Big>{ga}</Big>
        </DashboardCard>
        <DashboardCard title="Vitórias %" icon={Percent} compact>
          <Big>{winPct}%</Big>
        </DashboardCard>
        <DashboardCard title="Títulos" icon={Trophy} compact>
          <Big>{s?.titles ?? trophies.length}</Big>
        </DashboardCard>
        <DashboardCard title="Pontos" icon={TrendingUp} compact>
          <Big>{s?.points ?? 0}</Big>
        </DashboardCard>
        <DashboardCard title="Épocas Importadas" icon={CalendarRange} compact>
          <Big>{importedSeasonCount}</Big>
        </DashboardCard>
        <DashboardCard title="Jogadores Observados" icon={Users} compact>
          <Big>{fmtNum(importedPlayersCount)}</Big>
        </DashboardCard>
        <DashboardCard title="Impacto Médio/Jogador" icon={Sparkles} compact>
          <Big>{fmtNum(avgImpact, 1)}</Big>
        </DashboardCard>
      </div>

      <Card className="border-gold/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Evolução por Época</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {seasonTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados de evolução para apresentar.</p>
          ) : (
            <div className="space-y-2">
              {seasonTrend.map((item) => {
                const maxImpact = Math.max(1, ...seasonTrend.map((row) => row.impact));
                const width = Math.max(6, Math.round((item.impact / maxImpact) * 100));
                return (
                  <div key={item.year} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">Época {item.year}</span>
                      <span className="text-muted-foreground">
                        {fmtNum(item.impact)} impacto · {item.clubs} clube(s) · {item.comps} competição(ões)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-gold-soft via-gold to-gold-deep"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground leading-relaxed">{narrative}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Big({ children }: { children: React.ReactNode }) {
  return <div className="text-2xl font-display font-bold text-gold">{children}</div>;
}
