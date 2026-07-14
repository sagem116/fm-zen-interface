import { useMemo, useState } from "react";
import { useCareerTimeline, useCareerTrophies } from "@/lib/career/hooks";
import { CareerSeasonCard } from "./CareerSeasonCard";
import { CareerSeason as CareerSeasonPage } from "./CareerSeason";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CareerSeasonId } from "@/lib/career/types";
import { useCareerImportData } from "@/lib/career/hooks/useCareerImportData";

export function CareerTimeline() {
  const { timeline } = useCareerTimeline();
  const { trophies } = useCareerTrophies();
  const { seasons: mergedSeasons, importedSeasons } = useCareerImportData();
  const [selected, setSelected] = useState<CareerSeasonId | null>(null);

  const titlesBySeason = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of trophies) map[t.seasonId] = (map[t.seasonId] ?? 0) + 1;
    return map;
  }, [trophies]);

  if (selected) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
          ← Voltar às épocas
        </Button>
        <CareerSeasonPage seasonId={selected} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-display font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Épocas
        </h2>
        {mergedSeasons.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem épocas registadas.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mergedSeasons.map((row) =>
              row.localSeason ? (
                <div key={row.localSeason.id} className="space-y-2">
                  <CareerSeasonCard
                    season={row.localSeason}
                    titles={titlesBySeason[row.localSeason.id] ?? 0}
                    onClick={() => setSelected(row.localSeason?.id ?? null)}
                  />
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px]">
                      {row.imported?.competitions.length ?? 0} competição(ões)
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {row.imported?.clubs.length ?? 1} clube(s)
                    </Badge>
                  </div>
                </div>
              ) : (
                <Card key={row.year}>
                  <CardContent className="p-4 space-y-2">
                    <div className="text-sm font-display font-bold">Época {row.year}</div>
                    <p className="text-xs text-muted-foreground">
                      Esta época existe nos imports mas ainda não foi registada no histórico local da
                      carreira.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px]">
                        {row.imported?.competitions.length ?? 0} competição(ões)
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {row.imported?.clubs.length ?? 0} clube(s)
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ),
            )}
          </div>
        )}
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <CalendarClock className="size-4 text-gold" /> Cronologia de Imports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {importedSeasons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem cronologia importada.</p>
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
                      {season.clubs.length} clube(s)
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {season.coach} · {season.country ?? "País não definido"} · {season.competitions.length} competição(ões)
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Clock className="size-4 text-gold" /> Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem eventos ainda.</p>
          ) : (
            <ol className="relative border-l border-border/60 pl-4 space-y-4">
              {timeline.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[7px] top-1.5 size-2.5 rounded-full bg-gold" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      Época {e.season}
                    </Badge>
                    <span className="text-sm font-medium">{e.title}</span>
                  </div>
                  {e.description && (
                    <p className="text-xs text-muted-foreground mt-1">{e.description}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
