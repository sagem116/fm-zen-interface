import { Crown, MapPin, Shield, CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCareer, useCareerSeason, useCareerStatistics } from "@/lib/career/hooks";

export function CareerHeader() {
  const { career } = useCareer();
  const { currentSeason } = useCareerSeason();
  const { statistics } = useCareerStatistics();

  if (!career) return null;

  const winPct =
    statistics && statistics.matches
      ? Math.round((statistics.wins / statistics.matches) * 100)
      : null;

  return (
    <Card className="overflow-hidden border-gold/20">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-soft via-gold to-gold-deep text-primary-foreground shadow-[0_0_36px_-6px_oklch(0.82_0.17_88/0.55)] shrink-0">
              <Crown className="size-8" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-display font-bold tracking-tight gold-shimmer truncate">
                {career.name}
              </h1>
              {career.ownerName && (
                <p className="text-sm text-muted-foreground truncate">{career.ownerName}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {currentSeason?.club && (
                  <Badge variant="secondary" className="gap-1">
                    <Shield className="size-3" /> {currentSeason.club}
                  </Badge>
                )}
                {currentSeason?.country && (
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="size-3" /> {currentSeason.country}
                  </Badge>
                )}
                {currentSeason?.season != null && (
                  <Badge variant="outline" className="gap-1">
                    <CalendarClock className="size-3" /> Época {currentSeason.season}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="md:ml-auto grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
            <HeaderStat label="Jogos" value={statistics?.matches ?? 0} />
            <HeaderStat label="Títulos" value={statistics?.titles ?? 0} />
            <HeaderStat label="Vitórias %" value={winPct != null ? `${winPct}%` : "—"} />
            <HeaderStat label="Pontos" value={statistics?.points ?? 0} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HeaderStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-center">
      <div className="text-lg font-display font-bold text-gold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
