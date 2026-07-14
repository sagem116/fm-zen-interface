import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookMarked } from "lucide-react";
import { useCareerSeason, useCareerTrophies } from "@/lib/career/hooks";
import { useCareerImportData } from "@/lib/career/hooks/useCareerImportData";
import { fmtNum } from "@/lib/fmt";

export function CareerYearbooks() {
  const { seasons } = useCareerSeason();
  const { trophies } = useCareerTrophies();
  const { playersBySeason } = useCareerImportData();

  const rows = seasons
    .map((season) => {
      const seasonPlayers = playersBySeason[season.season] ?? [];
      const topPlayer = [...seasonPlayers].sort((a, b) => {
        const impactA = a.goals + a.assists;
        const impactB = b.goals + b.assists;
        if (impactA !== impactB) return impactB - impactA;
        return a.playerName.localeCompare(b.playerName, "pt", { sensitivity: "base" });
      })[0];
      const trophiesInSeason = trophies.filter((item) => item.season === season.season);
      const totalImpact = seasonPlayers.reduce((acc, item) => acc + item.goals + item.assists, 0);

      return {
        season,
        trophiesInSeason,
        topPlayer,
        totalImpact,
      };
    })
    .sort((a, b) => b.season.season - a.season.season);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-display font-bold flex items-center gap-2">
          <BookMarked className="size-5 text-gold" /> Anuários
        </h2>
        <p className="text-sm text-muted-foreground">
          Um anuário por época com narrativa automática, destaques e estatísticas consolidadas.
        </p>
      </div>
      {seasons.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Sem épocas ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ season, trophiesInSeason, topPlayer, totalImpact }) => (
            <Card key={season.id} className="border-gold/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display">Anuário {season.season}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <div>{season.club} · {season.country}</div>
                <div>
                  <Badge variant="outline" className="text-[10px]">
                    {trophiesInSeason.length} troféu(s)
                  </Badge>
                </div>
                <p className="leading-relaxed">
                  {trophiesInSeason.length > 0
                    ? `A época terminou com ${trophiesInSeason.length} conquista(s), reforçando a presença competitiva em ${season.league}.`
                    : `A época foi de consolidação em ${season.league}, com foco na evolução interna e consistência coletiva.`}
                </p>
                {topPlayer ? (
                  <div className="rounded-md border border-border/60 bg-muted/30 px-2 py-1">
                    <div className="font-medium text-foreground">Destaque: {topPlayer.playerName}</div>
                    <div>
                      {fmtNum(topPlayer.goals)} golos · {fmtNum(topPlayer.assists)} assistências · impacto {fmtNum(topPlayer.goals + topPlayer.assists)}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-border/60 bg-muted/30 px-2 py-1">
                    Sem destaque individual disponível nesta época.
                  </div>
                )}
                <div className="text-[11px]">
                  Impacto ofensivo agregado: <span className="text-foreground font-medium">{fmtNum(totalImpact)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
