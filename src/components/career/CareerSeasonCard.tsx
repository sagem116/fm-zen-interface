import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, MapPin, Trophy } from "lucide-react";
import type { CareerSeason } from "@/lib/career/types";

interface Props {
  season: CareerSeason;
  titles?: number;
  onClick?: () => void;
  active?: boolean;
}

export function CareerSeasonCard({ season, titles, onClick, active }: Props) {
  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer transition-colors hover:border-gold/40 ${
        active ? "border-gold/50 shadow-[0_0_18px_-8px_oklch(0.82_0.17_88/0.6)]" : ""
      }`}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-display font-bold">Época {season.season}</div>
          {titles != null && (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Trophy className="size-3" /> {titles}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
          <Shield className="size-3 shrink-0" /> {season.club}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
          <MapPin className="size-3 shrink-0" /> {season.country} · {season.league}
        </div>
      </CardContent>
    </Card>
  );
}
