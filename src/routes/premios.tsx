import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/AppShell";
import {
  useAwardsDataset,
  computeAwards,
  SCOPE_LABEL,
  type AwardScope,
  type AwardCategory,
} from "@/lib/awards/engine";

export const Route = createFileRoute("/premios")({
  head: () => ({
    meta: [
      { title: "Prémios — Análise FM" },
      { name: "description", content: "Prémios globais atribuídos aos melhores clubes, treinadores e jogadores por época e âmbito." },
      { property: "og:title", content: "Prémios Globais" },
      { property: "og:description", content: "Prémios por época e âmbito calculados a partir dos dados existentes." },
    ],
  }),
  component: PremiosPage,
});

const SCOPES: AwardScope[] = ["superleague", "national", "continental", "international", "world"];

function entityHref(w: NonNullable<AwardCategory["winner"]>): string | null {
  if (!w.entity) return null;
  const name = encodeURIComponent(w.entity.name);
  if (w.entity.kind === "player") return `/jogadores/${name}`;
  if (w.entity.kind === "coach") return `/treinadores/${name}`;
  if (w.entity.kind === "club") return `/clubes/${name}`;
  return null;
}

function AwardCard({ cat }: { cat: AwardCategory }) {
  const w = cat.winner;
  const href = w ? entityHref(w) : null;
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy className="h-3.5 w-3.5 text-primary" />
          {cat.label}
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">{cat.description}</p>
      </CardHeader>
      <CardContent>
        {!w ? (
          <p className="text-xs text-muted-foreground italic">Sem dados suficientes</p>
        ) : (
          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              {href ? (
                <Link to={href} className="text-base font-semibold hover:underline truncate">
                  {w.name}
                </Link>
              ) : (
                <span className="text-base font-semibold truncate">{w.name}</span>
              )}
              <Badge variant="outline" className="text-[10px] shrink-0">{w.metric}</Badge>
            </div>
            {w.subject && (
              <p className="text-xs text-muted-foreground truncate">{w.subject}</p>
            )}
            {w.detail && (
              <p className="text-[11px] text-muted-foreground truncate">{w.detail}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PremiosPage() {
  const { data: ds, isLoading } = useAwardsDataset();
  const [season, setSeason] = useState<number | null>(null);

  const seasons = ds?.seasons ?? [];
  const currentSeason = season ?? seasons[0] ?? null;

  const perScope = useMemo(() => {
    if (!ds || currentSeason == null) return null;
    const out: Record<AwardScope, AwardCategory[]> = {} as Record<AwardScope, AwardCategory[]>;
    for (const sc of SCOPES) out[sc] = computeAwards(ds, currentSeason, sc);
    return out;
  }, [ds, currentSeason]);

  return (
    <AppShell title="Prémios">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" /> Prémios
            </h1>
            <p className="text-sm text-muted-foreground">
              Prémios calculados de forma determinística a partir dos dados carregados.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Época</span>
            <Select
              value={currentSeason?.toString() ?? ""}
              onValueChange={(v) => setSeason(Number(v))}
              disabled={!seasons.length}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {seasons.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !perScope || currentSeason == null ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Sem épocas disponíveis. Importa dados para calcular prémios.
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="superleague" className="w-full">
            <TabsList className="flex w-full flex-wrap h-auto">
              {SCOPES.map((sc) => (
                <TabsTrigger key={sc} value={sc} className="flex-1 min-w-[10rem]">
                  {SCOPE_LABEL[sc]}
                </TabsTrigger>
              ))}
            </TabsList>
            {SCOPES.map((sc) => (
              <TabsContent key={sc} value={sc} className="mt-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {perScope[sc].map((c) => (
                    <AwardCard key={c.id} cat={c} />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </AppShell>
  );
}
