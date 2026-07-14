import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import { useCareerTrophies } from "@/lib/career/hooks";
import type { CareerTrophy } from "@/lib/career/types";

export function CareerTrophyRoom() {
  const { trophies } = useCareerTrophies();
  const [selected, setSelected] = useState<CareerTrophy | null>(null);

  if (trophies.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          A sala de troféus está vazia — por enquanto.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {trophies.map((t) => (
          <Card
            key={t.id}
            onClick={() => setSelected(t)}
            className="cursor-pointer hover:border-gold/40 transition-colors"
          >
            <CardContent className="p-4 text-center space-y-2">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-gold-soft via-gold to-gold-deep text-primary-foreground shadow-[0_0_24px_-8px_oklch(0.82_0.17_88/0.6)]">
                <Trophy className="size-6" />
              </div>
              <div className="text-sm font-display font-bold truncate">{t.name}</div>
              <div className="text-xs text-muted-foreground truncate">{t.competition}</div>
              <Badge variant="outline" className="text-[10px]">
                Época {t.season}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent>
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                <div className="aspect-video rounded-lg border border-border/60 bg-muted/30 flex items-center justify-center text-muted-foreground">
                  <Trophy className="size-10 text-gold" />
                </div>
                <div>
                  <span className="text-muted-foreground">Competição: </span>
                  {selected.competition}
                </div>
                <div>
                  <span className="text-muted-foreground">Época: </span>
                  {selected.season}
                </div>
                <div>
                  <span className="text-muted-foreground">Clube: </span>
                  {selected.club}
                </div>
                {selected.description && (
                  <p className="text-muted-foreground">{selected.description}</p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
