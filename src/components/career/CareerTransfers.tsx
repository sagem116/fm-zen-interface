import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft } from "lucide-react";
import { useCareerSeason, useCareerStatistics } from "@/lib/career/hooks";
import { useCareerImportData } from "@/lib/career/hooks/useCareerImportData";
import { fmtNum, fmtMoney } from "@/lib/fmt";
import type { CareerTransferAssessment } from "@/lib/career/types";

export function CareerTransfers() {
  const { seasons } = useCareerSeason();
  const { transferAssessments } = useCareerStatistics();
  const { importedPlayers } = useCareerImportData();

  const transferRows = Object.entries(transferAssessments ?? {})
    .flatMap(([seasonId, list]) =>
      (Array.isArray(list) ? list : ([] as CareerTransferAssessment[])).map((item) => {
        const season = seasons.find((entry) => entry.id === seasonId);
        return {
          ...item,
          season: season?.season,
          country: season?.country,
        };
      }),
    )
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const topValues = [...importedPlayers].sort((a, b) => b.value - a.value).slice(0, 8);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <ArrowRightLeft className="size-4 text-gold" /> Avaliação de Transferências
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transferRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sem avaliações formais registadas. Esta área será preenchida automaticamente quando
              existirem classificações de mercado por época.
            </p>
          ) : (
            <ul className="space-y-2">
              {transferRows.map((row) => (
                <li key={row.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{row.playerName}</div>
                    <Badge variant="outline" className="text-[10px]">
                      {row.label}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {row.club}
                    {row.season ? ` · Época ${row.season}` : ""}
                    {row.country ? ` · ${row.country}` : ""}
                    {row.value != null ? ` · ${fmtNum(row.value)}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Mercado em Contexto</CardTitle>
        </CardHeader>
        <CardContent>
          {topValues.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem snapshots de mercado disponíveis.</p>
          ) : (
            <ul className="space-y-2">
              {topValues.map((player) => (
                <li
                  key={`${player.seasonYear}-${player.club}-${player.idu ?? player.playerName}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium">{player.playerName}</div>
                    <div className="text-xs text-muted-foreground">
                      {player.club} · Época {player.seasonYear}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gold">{fmtMoney(player.value)}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
