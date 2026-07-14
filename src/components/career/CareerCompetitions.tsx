import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Globe2 } from "lucide-react";
import { useCareerTrophies } from "@/lib/career/hooks";
import { useCareerImportData } from "@/lib/career/hooks/useCareerImportData";
import { fmtNum } from "@/lib/fmt";

const GROUPS = [
  { icon: Trophy, label: "Liga" },
  { icon: Medal, label: "Taças" },
  { icon: Globe2, label: "Continentais" },
];

export function CareerCompetitions() {
  const { trophies } = useCareerTrophies();
  const { importedSeasons } = useCareerImportData();

  const allCompetitions = importedSeasons.flatMap((season) => season.competitions);
  const competitionCount = new Map<string, number>();
  for (const comp of allCompetitions) {
    competitionCount.set(comp, (competitionCount.get(comp) ?? 0) + 1);
  }

  const trophiesByCompetition = new Map<string, number>();
  for (const trophy of trophies) {
    const key = trophy.competition || "Sem competição";
    trophiesByCompetition.set(key, (trophiesByCompetition.get(key) ?? 0) + 1);
  }

  const rows = [...competitionCount.entries()]
    .map(([competition, appearances]) => ({
      competition,
      appearances,
      titles: trophiesByCompetition.get(competition) ?? 0,
    }))
    .sort((a, b) => {
      if (b.titles !== a.titles) return b.titles - a.titles;
      if (b.appearances !== a.appearances) return b.appearances - a.appearances;
      return a.competition.localeCompare(b.competition, "pt", { sensitivity: "base" });
    });

  const hasData = rows.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {GROUPS.map(({ icon: Icon, label }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Icon className="size-4 text-gold" /> {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Participações mapeadas: {fmtNum(allCompetitions.length)}
              </p>
              <p className="text-xs text-muted-foreground">Títulos associados: {fmtNum(trophies.length)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Histórico Competitivo</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <p className="text-sm text-muted-foreground">
              Sem histórico competitivo suficiente. Associa o treinador e importa épocas para
              construir esta visão.
            </p>
          ) : (
            <div className="space-y-2">
              {rows.map((row) => {
                const ratio = row.appearances > 0 ? Math.round((row.titles / row.appearances) * 100) : 0;
                return (
                  <div
                    key={row.competition}
                    className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium">{row.competition}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {row.appearances} presença(s)
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {row.titles} título(s)
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {ratio}% conversão
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Evolução por Época</CardTitle>
        </CardHeader>
        <CardContent>
          {importedSeasons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem épocas importadas.</p>
          ) : (
            <div className="space-y-2">
              {importedSeasons.map((season) => (
                <div
                  key={season.seasonYear}
                  className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">Época {season.seasonYear}</div>
                    <Badge variant="outline" className="text-[10px]">
                      {season.competitions.length} competição(ões)
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {season.competitions.join(" · ") || "Sem competições registadas"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
