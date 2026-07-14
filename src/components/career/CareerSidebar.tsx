import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCareerSeason } from "@/lib/career/hooks";

export function CareerSidebar() {
  const { seasons, currentSeason } = useCareerSeason();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <CalendarClock className="size-4 text-gold" /> Épocas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {seasons.length === 0 && (
          <p className="text-xs text-muted-foreground">Sem épocas registadas.</p>
        )}
        {seasons.map((s) => {
          const isCurrent = currentSeason?.id === s.id;
          return (
            <div
              key={s.id}
              className={`rounded-lg border px-3 py-2 text-xs ${
                isCurrent ? "border-gold/40 bg-gold/5" : "border-border/60 bg-muted/20"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">Época {s.season}</span>
                {isCurrent && (
                  <Badge variant="secondary" className="text-[10px]">
                    Atual
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground truncate mt-0.5">
                {s.club} · {s.country}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
