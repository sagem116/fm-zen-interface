import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, TrendingUp, TrendingDown, Minus, ArrowUpRight } from "lucide-react";
import type { BreakdownItem, ComputeResult, RankingEntry } from "@/lib/fm-rankings";
import type { FmConfig } from "@/lib/fm-config";
import {
  entityStats,
  groupBreakdown,
  contributionByCompetition,
  summariseSources,
  totalWeightedFromBreakdown,
  pickBreakdown,
  pickEntries,
  pickEvolution,
} from "@/lib/fm-rankings-analysis";
import { buildNarrative } from "@/lib/fm-rankings-narrative";
import { EvolutionChart, type EvoPoint } from "@/components/EvolutionChart";
import { fmtPts } from "@/lib/fmt";

type Kind = "clubes" | "treinadores" | "paises";

const SOURCE_LABEL: Record<BreakdownItem["source"], string> = {
  position: "Posição na liga",
  "champion-bonus": "Bónus de campeão",
  "promotion-bonus": "Bónus de promoção",
  "league-position-bonus": "Bónus de posição",
  "league-points": "Pontos da liga",
  "continental-win": "Vitória continental / título",
  "continental-loss": "Final continental",
  "continental-sf": "Meia-final continental",
  "continental-qf": "Quarto-final continental",
  "dobradinha-bonus": "Bónus dobradinha",
  "dobradinha-int-bonus": "Bónus dobradinha internacional",
  "triplete-bonus": "Bónus triplete",
  "quadruple-bonus": "Bónus quadruplo",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string | null;
  kind: Kind;
  ranks: ComputeResult;
  config: FmConfig;
  activeProfileId?: string | null;
  dataSummary?: { seasons: number; lastImport?: number | null };
}

export function RankingExplainSheet({
  open,
  onOpenChange,
  name,
  kind,
  ranks,
  config,
  activeProfileId,
  dataSummary,
}: Props) {
  const entries = pickEntries(ranks, kind);
  const evolution = pickEvolution(ranks, kind);
  const breakdown = pickBreakdown(ranks, kind);

  const entry: RankingEntry | undefined = useMemo(
    () => (name ? entries.find((e) => e.name === name) : undefined),
    [entries, name],
  );
  const evo = name ? evolution[name] : undefined;
  const bd = name ? (breakdown[name] ?? []) : [];
  const stats = useMemo(() => entityStats(evo), [evo]);
  const grouped = useMemo(() => groupBreakdown(bd), [bd]);
  const perComp = useMemo(() => contributionByCompetition(bd), [bd]);
  const perSource = useMemo(() => summariseSources(bd), [bd]);
  const bdTotal = useMemo(() => totalWeightedFromBreakdown(bd), [bd]);
  const narrative = useMemo(
    () => (name ? buildNarrative(name, kind, entry, evo, bd, entries) : []),
    [name, kind, entry, evo, bd, entries],
  );

  const officialWeighted = entry?.weighted ?? 0;
  const officialRaw = entry?.raw ?? 0;
  const divergence = officialWeighted > 0 && Math.abs(bdTotal - officialWeighted) > 0.5;

  const evoPoints: EvoPoint[] = useMemo(() => {
    if (!evo) return [];
    const rbySeason: Record<number, number | null> = {};
    const years = Object.keys(evo)
      .map(Number)
      .sort((a, b) => a - b);
    // build ranks by season across the whole ranking
    for (const y of years) {
      const pairs: [string, number][] = [];
      for (const [n, series] of Object.entries(evolution)) {
        const v = series[y] ?? 0;
        if (v > 0) pairs.push([n, v]);
      }
      pairs.sort((a, b) => b[1] - a[1]);
      const idx = pairs.findIndex(([n]) => n === name);
      rbySeason[y] = idx >= 0 ? idx + 1 : null;
    }
    return years.map((y) => ({
      year: y,
      weighted: evo[y] ?? 0,
      raw: evo[y] ?? 0,
      positionWeighted: rbySeason[y] ?? null,
      positionRaw: rbySeason[y] ?? null,
    }));
  }, [evo, evolution, name]);

  const position = name ? entries.findIndex((e) => e.name === name) + 1 : 0;
  const kindLink =
    kind === "clubes"
      ? "/clubes/$name"
      : kind === "treinadores"
        ? "/treinadores/$name"
        : "/paises/$name";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[720px] overflow-y-auto">
        {name && entry ? (
          <>
            <SheetHeader className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <SheetTitle className="text-xl">{name}</SheetTitle>
                <Badge variant="secondary">
                  {kind === "clubes" ? "Clube" : kind === "treinadores" ? "Treinador" : "País"}
                </Badge>
                {position > 0 && <Badge variant="outline">#{position} no ranking</Badge>}
                <Link
                  to={kindLink}
                  params={{ name }}
                  className="ml-auto text-xs text-primary hover:underline inline-flex items-center gap-1"
                  search={{ tab: undefined }}
                >
                  Perfil completo <ArrowUpRight className="size-3" />
                </Link>
              </div>
              <SheetDescription className="text-xs">
                Painel apenas explicativo. Todos os totais apresentados usam sempre os valores
                oficiais produzidos pelo motor de Rankings.
              </SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="summary" className="mt-4">
              <TabsList className="w-full flex flex-wrap h-auto">
                <TabsTrigger value="summary" className="flex-1">
                  Resumo
                </TabsTrigger>
                <TabsTrigger value="contrib" className="flex-1">
                  Contribuição
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-1">
                  Histórico
                </TabsTrigger>
                <TabsTrigger value="narrative" className="flex-1">
                  Narrativa
                </TabsTrigger>
                <TabsTrigger value="source" className="flex-1">
                  Origem
                </TabsTrigger>
              </TabsList>

              {/* --- Summary --- */}
              <TabsContent value="summary" className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Kpi label="Pontos ponderados" value={fmtPts(officialWeighted)} />
                  <Kpi label="Pontos brutos" value={fmtPts(officialRaw)} />
                  <Kpi label="Títulos" value={entry.titles} />
                  <Kpi label="Épocas" value={stats.seasons} />
                  <Kpi label="Média/época" value={fmtPts(stats.avg)} />
                  <Kpi
                    label="Pico histórico"
                    value={stats.best ? `${fmtPts(stats.best.value)} (${stats.best.year})` : "—"}
                  />
                </div>

                <Card className="p-3 space-y-2">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Fórmula & pesos ativos
                  </div>
                  <div className="text-sm">
                    <div>
                      Perfil ativo:{" "}
                      <span className="font-medium">{activeProfileId ?? "default"}</span>
                    </div>
                    <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-0.5 mt-1">
                      <li>
                        Pesos por competição — SuperLeague ×
                        {fmtPts(config.competitionWeights.superleague)}, Nacional ×
                        {fmtPts(config.competitionWeights.national)}, Continental ×
                        {fmtPts(config.competitionWeights.continental)}, Internacional ×
                        {fmtPts(config.competitionWeights.international)}
                      </li>
                      <li>
                        Decaimento por época — última ×{fmtPts(config.decayMultipliers.last)}, −1 ×
                        {fmtPts(config.decayMultipliers.age1)}, −2 ×
                        {fmtPts(config.decayMultipliers.age2)}, −3 ×
                        {fmtPts(config.decayMultipliers.age3)}, mais antigo ×
                        {fmtPts(config.decayMultipliers.older)}
                      </li>
                      <li>
                        Pesos por divisão —{" "}
                        {Object.entries(config.divisionWeights)
                          .sort(([a], [b]) => Number(a) - Number(b))
                          .map(([d, w]) => `D${d} ×${fmtPts(w)}`)
                          .join(" · ")}
                      </li>
                    </ul>
                  </div>
                </Card>

                <Card className="p-3 space-y-2">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Contribuição por competição
                  </div>
                  {perComp.length ? (
                    <ul className="text-sm space-y-1">
                      {perComp.slice(0, 8).map((c) => (
                        <li key={c.competition} className="flex items-center gap-2">
                          <span className="truncate">{c.competition}</span>
                          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                            {fmtPts(c.weighted)} pts · {Math.round(c.share * 100)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem dados de breakdown.</p>
                  )}
                </Card>

                <Card className="p-3 space-y-2">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Bónus, penalizações & fontes
                  </div>
                  {Object.keys(perSource).length ? (
                    <ul className="text-xs space-y-1">
                      {Object.entries(perSource)
                        .sort((a, b) => b[1].weighted - a[1].weighted)
                        .map(([src, v]) => (
                          <li key={src} className="flex items-center gap-2">
                            <span>{SOURCE_LABEL[src as BreakdownItem["source"]] ?? src}</span>
                            <span className="text-muted-foreground">×{v.count}</span>
                            <span className="ml-auto tabular-nums text-muted-foreground">
                              {fmtPts(v.weighted)} pts
                            </span>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem contribuições registadas.</p>
                  )}
                </Card>

                {divergence && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                    <Info className="size-3.5 mt-0.5 shrink-0" />
                    <div>
                      A soma explicativa do breakdown ({fmtPts(bdTotal)}) difere do total oficial do
                      ranking ({fmtPts(officialWeighted)}). A apresentação usa sempre o valor
                      oficial. O breakdown detalhado serve apenas de auxílio.
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* --- Contribution table (per season × competition) --- */}
              <TabsContent value="contrib">
                <Card className="p-0 overflow-hidden">
                  <div className="max-h-[520px] overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-card z-10 border-b border-border text-muted-foreground uppercase">
                        <tr>
                          <th className="text-left p-2">Época</th>
                          <th className="text-left p-2">Competição</th>
                          <th className="text-right p-2">Bruto</th>
                          <th className="text-right p-2">×Comp</th>
                          <th className="text-right p-2">×Div</th>
                          <th className="text-right p-2">×Decay</th>
                          <th className="text-right p-2">Ponderado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grouped.map((g, i) => (
                          <tr key={i} className="border-b border-border/40 hover:bg-muted/30">
                            <td className="p-2 tabular-nums">{g.season_year}</td>
                            <td className="p-2 truncate max-w-[220px]">{g.competition}</td>
                            <td className="p-2 text-right tabular-nums">{fmtPts(g.raw)}</td>
                            <td className="p-2 text-right tabular-nums text-muted-foreground">
                              ×{fmtPts(g.compW)}
                            </td>
                            <td className="p-2 text-right tabular-nums text-muted-foreground">
                              ×{fmtPts(g.divW)}
                            </td>
                            <td className="p-2 text-right tabular-nums text-muted-foreground">
                              ×{fmtPts(g.decay)}
                            </td>
                            <td className="p-2 text-right tabular-nums font-medium">
                              {fmtPts(g.weighted)}
                            </td>
                          </tr>
                        ))}
                        {!grouped.length && (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-muted-foreground">
                              Sem contribuições registadas.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {grouped.length > 0 && (
                        <tfoot className="sticky bottom-0 bg-card border-t border-border">
                          <tr className="font-semibold">
                            <td colSpan={6} className="p-2 text-right">
                              Total (breakdown)
                            </td>
                            <td className="p-2 text-right tabular-nums">{fmtPts(bdTotal)}</td>
                          </tr>
                          <tr className="text-xs text-muted-foreground">
                            <td colSpan={6} className="p-2 text-right">
                              Total oficial (ranking)
                            </td>
                            <td className="p-2 text-right tabular-nums">
                              {fmtPts(officialWeighted)}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </Card>
              </TabsContent>

              {/* --- History --- */}
              <TabsContent value="history" className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Kpi label="Épocas" value={stats.seasons} />
                  <Kpi label="Média" value={fmtPts(stats.avg)} />
                  <Kpi
                    label="Pico"
                    value={stats.best ? `${fmtPts(stats.best.value)}` : "—"}
                    sub={stats.best?.year ? `Época ${stats.best.year}` : undefined}
                  />
                  <Kpi
                    label="Pior época"
                    value={stats.worst ? `${fmtPts(stats.worst.value)}` : "—"}
                    sub={stats.worst?.year ? `Época ${stats.worst.year}` : undefined}
                  />
                  <Kpi
                    label="Δ vs anterior"
                    value={fmtDelta(stats.deltaPrev)}
                    trend={stats.deltaPrev > 0 ? "up" : stats.deltaPrev < 0 ? "down" : "flat"}
                  />
                  <Kpi
                    label="Δ vs pico"
                    value={fmtDelta(stats.deltaPeak)}
                    trend={stats.deltaPeak >= 0 ? "flat" : "down"}
                  />
                  <Kpi
                    label="Tendência"
                    value={fmtDelta(stats.trend) + "/ép"}
                    trend={stats.trend > 0 ? "up" : stats.trend < 0 ? "down" : "flat"}
                  />
                  <Kpi
                    label="Primeira"
                    value={stats.first ?? "—"}
                    sub={stats.last ? `Última ${stats.last}` : undefined}
                  />
                </div>
                <Card className="p-3">
                  {evoPoints.length ? (
                    <EvolutionChart data={evoPoints} showModeToggle={false} />
                  ) : (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Sem série de evolução.
                    </p>
                  )}
                </Card>
              </TabsContent>

              {/* --- Narrative --- */}
              <TabsContent value="narrative">
                <Card className="p-4 space-y-3">
                  {narrative.length ? (
                    narrative.map((p, i) => (
                      <p
                        key={i}
                        className="text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: escapeHtml(p).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"),
                        }}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sem dados suficientes para gerar narrativa.
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground border-t border-border/50 pt-2">
                    Texto gerado deterministicamente a partir dos valores oficiais. Sem IA
                    generativa.
                  </p>
                </Card>
              </TabsContent>

              {/* --- Source --- */}
              <TabsContent value="source">
                <Card className="p-3 space-y-2 text-sm">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Origem dos dados
                  </div>
                  <ul className="space-y-1 text-sm">
                    <li>
                      Épocas com dados desta entidade:{" "}
                      <span className="font-medium">{stats.seasons}</span>
                    </li>
                    <li>
                      Primeira época: <span className="font-medium">{stats.first ?? "—"}</span>
                    </li>
                    <li>
                      Última época: <span className="font-medium">{stats.last ?? "—"}</span>
                    </li>
                    <li>
                      Total de linhas de breakdown: <span className="font-medium">{bd.length}</span>
                    </li>
                    {dataSummary && (
                      <li>
                        Épocas importadas no total:{" "}
                        <span className="font-medium">{dataSummary.seasons}</span>
                      </li>
                    )}
                    <li>
                      Perfil de configuração:{" "}
                      <span className="font-medium">{activeProfileId ?? "default"}</span>
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                    Todos os cálculos apresentados provêm exclusivamente do output oficial de{" "}
                    <code>useRankings()</code>. Nenhum valor é recalculado nesta vista.
                  </p>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-8">Nada selecionado.</p>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Kpi({
  label,
  value,
  sub,
  trend,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  trend?: "up" | "down" | "flat";
}) {
  const Icon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : trend === "flat" ? Minus : null;
  const color =
    trend === "up"
      ? "text-emerald-500"
      : trend === "down"
        ? "text-rose-500"
        : trend === "flat"
          ? "text-muted-foreground"
          : "";
  return (
    <Card className="p-2.5">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold tabular-nums flex items-center gap-1 ${color}`}>
        {Icon && <Icon className="size-3.5" />}
        {value}
      </div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </Card>
  );
}

function fmtDelta(v: number) {
  if (!Number.isFinite(v)) return "—";
  const s = v > 0 ? "+" : "";
  return `${s}${fmtPts(v)}`;
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}
