import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import { useCareerAchievements, useCareerSeason } from "@/lib/career/hooks";

export function CareerAchievements() {
  const { achievements } = useCareerAchievements();
  const { seasons } = useCareerSeason();

  const seasonByYear = new Map(seasons.map((season) => [season.season, season]));

  const grouped = achievements.reduce(
    (acc, item) => {
      const key = `${item.season}`;
      const list = acc.get(key) ?? [];
      list.push(item);
      acc.set(key, list);
      return acc;
    },
    new Map<string, typeof achievements>(),
  );

  const seasonsOrdered = [...grouped.keys()]
    .map((value) => Number(value))
    .sort((a, b) => b - a);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <Award className="size-4 text-gold" /> Conquistas e Desafios ({achievements.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {achievements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem conquistas registadas.</p>
        ) : (
          <div className="space-y-3">
            {seasonsOrdered.map((seasonYear) => {
              const seasonAchievements = grouped.get(String(seasonYear)) ?? [];
              const season = seasonByYear.get(seasonYear);
              return (
                <div key={seasonYear} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-sm font-medium">Época {seasonYear}</div>
                    <Badge variant="outline" className="text-[10px]">
                      {seasonAchievements.length} desafio(s)
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {season ? `${season.club} · ${season.country}` : "Clube não associado"}
                  </div>
                  <ul className="space-y-2">
                    {seasonAchievements.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{a.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {a.competition ? `${a.competition}` : "Sem competição associada"}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {a.type}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
