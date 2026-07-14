/**
 * IntelligentProfileSection
 *
 * Reusable panel that consumes the Intelligence Engine (Phase 1) and renders
 * the resulting ProfileResult for any supported entity kind. Purely
 * presentational: no ranking, config or database logic here.
 */
import { useMemo, useState } from "react";
import {
  Brain,
  ChevronDown,
  GitCompareArrows,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRankings } from "@/lib/useRankings";
import { usePlayerUniverse } from "@/lib/player-universe";
import {
  buildClubProfile as engineClubProfile,
  buildCoachProfile as engineCoachProfile,
  buildCompetitionProfile as engineCompetitionProfile,
  buildCountryProfile as engineCountryProfile,
  buildPlayerProfile as engineePlayerProfile,
  type EntityKind,
  type Evidence,
  type ProfileResult,
  type TraitResult,
} from "@/lib/intelligence";
import { buildIntelligenceInputs, listEntityNames } from "@/lib/intelligence-adapters";
import { EntityCombobox } from "@/components/EntityCombobox";
import { useProfileUniverse } from "@/components/profile/useProfileUniverse";

interface Props {
  kind: EntityKind;
  name: string;
}

function runEngine(kind: EntityKind, entity: any, cohort: any[]): ProfileResult {
  const opts = { entity, cohort };
  switch (kind) {
    case "club":
      return engineClubProfile(opts);
    case "player":
      return engineePlayerProfile(opts);
    case "coach":
      return engineCoachProfile(opts);
    case "competition":
      return engineCompetitionProfile(opts);
    case "country":
      return engineCountryProfile(opts);
  }
}

const KIND_LABEL: Record<EntityKind, string> = {
  club: "Clube",
  player: "Jogador",
  coach: "Treinador",
  competition: "Competição",
  country: "País",
};

function polarityClass(p: TraitResult["polarity"]): string {
  if (p === "positive")
    return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
  if (p === "negative") return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
  return "bg-muted text-muted-foreground border-border";
}

function normalizerText(n: Evidence["normalizer"]): string {
  switch (n.kind) {
    case "percentile":
      return "percentil da coorte";
    case "linear":
      return `linear [${n.min}..${n.max}]`;
    case "threshold":
      return `limiar @ ${n.at}${n.band ? ` ±${n.band}` : ""}`;
    case "identity":
      return "identidade (0..1)";
  }
}

function fmt(v: number | null, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-PT", { maximumFractionDigits: digits });
}

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function TraitCard({ trait, compareScore }: { trait: TraitResult; compareScore?: number }) {
  const [open, setOpen] = useState(false);
  const delta = compareScore != null ? trait.score - compareScore : null;
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border">
        <CollapsibleTrigger asChild>
          <button className="w-full text-left p-4 hover:bg-muted/40 rounded-t-md transition-colors">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={polarityClass(trait.polarity)}>
                    {trait.label}
                  </Badge>
                  {trait.level && (
                    <span className="text-xs text-muted-foreground">{trait.level}</span>
                  )}
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {trait.group}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1">
                    <Progress value={trait.score} className="h-1.5" />
                  </div>
                  <span className="text-sm font-semibold tabular-nums w-14 text-right">
                    {trait.score.toFixed(0)}
                  </span>
                  {delta != null && (
                    <span
                      className={`text-xs tabular-nums w-14 text-right ${delta > 0 ? "text-emerald-500" : delta < 0 ? "text-red-500" : "text-muted-foreground"}`}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta.toFixed(0)}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Confiança {(trait.confidence * 100).toFixed(0)}%</span>
                  <span className="inline-flex items-center gap-1">
                    Evidências{" "}
                    <ChevronDown
                      className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </span>
                </div>
              </div>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t px-4 py-3 space-y-2 bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              Regra: <code className="text-[10px]">{trait.ruleId}</code>
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground uppercase text-[10px]">
                  <th className="text-left py-1">Métrica</th>
                  <th className="text-right py-1">Valor</th>
                  <th className="text-right py-1">Norm.</th>
                  <th className="text-right py-1">Peso</th>
                  <th className="text-right py-1">Contrib.</th>
                  <th className="text-left py-1 pl-2">Normalizador</th>
                </tr>
              </thead>
              <tbody>
                {trait.evidence.map((e) => (
                  <tr key={e.metricId} className="border-t border-border/50">
                    <td className="py-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">{e.metricLabel}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <code className="text-[10px]">{e.metricId}</code>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {fmt(e.rawValue)}
                      {e.unit ? ` ${e.unit}` : ""}
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {(e.normalizedValue * 100).toFixed(0)}%
                    </td>
                    <td className="py-1 text-right tabular-nums">{(e.weight * 100).toFixed(0)}%</td>
                    <td className="py-1 text-right tabular-nums font-semibold">
                      {(e.contribution * 100).toFixed(1)}
                    </td>
                    <td className="py-1 pl-2 text-muted-foreground">
                      {normalizerText(e.normalizer)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function IntelligentProfileSection({ kind, name }: Props) {
  const { data, isLoading } = useRankings();
  const playerUniverse = usePlayerUniverse();
  const [compareName, setCompareName] = useState<string | null>(null);

  // Resolve Player Universe entry when available to prefer individual fields
  const dummyCtx = { kind, name, data: data ?? ({} as any), profile: null, meta: {}, currentRank: null, quickStats: [] } as any;
  const uni = useProfileUniverse(dummyCtx);

  const primary = useMemo(() => {
    const inputs = data ? buildIntelligenceInputs(kind, name, data.data, data.ranks) : null;
    if (!inputs) return null;
    return {
      profile: runEngine(kind, inputs.entity, inputs.cohort),
      cohortSize: inputs.cohort.length,
    };
  }, [data, kind, name]);

  const primaryFromUniverse = useMemo(() => {
    if (kind !== "player") return null;
    const selected = (playerUniverse.list ?? []).find((item) => norm(item.name) === norm(name));
    if (!selected) return null;
    const cohort = (playerUniverse.list ?? []).map((item) => ({
      id: item.idu ?? item.uid ?? item.name,
      name: item.name,
      age: item.age ?? null,
      ca: item.ca ?? null,
      cp: item.pa ?? null,
      avgCA: item.ca ?? null,
      avgCP: item.pa ?? null,
      goals: 0,
      games: 1,
      titles: 0,
      seasons: Object.keys(item.history ?? {}).length,
      internationalPoints: null,
      playersAbroad: null,
    }));
    const entity = cohort.find((item) => norm(item.name) === norm(name));
    if (!entity) return null;
    return {
      profile: runEngine("player", entity as any, cohort as any[]),
      cohortSize: cohort.length,
    };
  }, [kind, name, playerUniverse.list]);

  const comparison = useMemo(() => {
    if (!compareName) return null;
    if (data) {
      const inputs = buildIntelligenceInputs(kind, compareName, data.data, data.ranks);
      if (inputs) return runEngine(kind, inputs.entity, inputs.cohort);
    }
    if (kind !== "player") return null;
    const cohort = (playerUniverse.list ?? []).map((item) => ({
      id: item.idu ?? item.uid ?? item.name,
      name: item.name,
      age: item.age ?? null,
      ca: item.ca ?? null,
      cp: item.pa ?? null,
      avgCA: item.ca ?? null,
      avgCP: item.pa ?? null,
      goals: 0,
      games: 1,
      titles: 0,
      seasons: Object.keys(item.history ?? {}).length,
      internationalPoints: null,
      playersAbroad: null,
    }));
    const entity = cohort.find((item) => norm(item.name) === norm(compareName));
    return entity ? runEngine("player", entity as any, cohort as any[]) : null;
  }, [data, kind, compareName, playerUniverse.list]);

  const compareOptions = useMemo(() => {
    const set = new Set<string>();
    if (data) {
      for (const n of listEntityNames(kind, data.data, data.ranks)) set.add(n);
    }
    if (kind === "player") {
      for (const item of playerUniverse.list ?? []) if (item?.name) set.add(item.name);
    }
    return [...set].filter((n) => n !== name).sort((a, b) => a.localeCompare(b, "pt-PT"));
  }, [data, kind, name, playerUniverse.list]);

  if (isLoading || !data) return null;
  const resolvedPrimary = primary ?? primaryFromUniverse;

  if (!resolvedPrimary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="size-4" /> Perfil Inteligente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sem dados suficientes para gerar o perfil.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { profile, cohortSize } = resolvedPrimary;

  // Group traits by group name.
  const grouped = new Map<string, TraitResult[]>();
  for (const t of profile.traits) {
    const arr = grouped.get(t.group) ?? [];
    arr.push(t);
    grouped.set(t.group, arr);
  }

  const compareByTraitId = new Map<string, number>();
  if (comparison) {
    for (const t of comparison.traits) compareByTraitId.set(t.id, t.score);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="size-4" /> Perfil Inteligente
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {KIND_LABEL[kind]} · Coorte de {cohortSize} · Config {profile.configName} v
              {profile.configVersion}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {compareName ? (
              <Badge variant="secondary" className="gap-1">
                <GitCompareArrows className="size-3" /> vs {compareName}
                <button onClick={() => setCompareName(null)} aria-label="Fechar comparação">
                  <X className="size-3 ml-1" />
                </button>
              </Badge>
            ) : (
              <div className="w-64">
                <EntityCombobox
                  options={compareOptions}
                  value={""}
                  onChange={(v) => setCompareName(v || null)}
                  placeholder="Comparar com…"
                />
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {profile.traits.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma característica atingiu o limiar mínimo.
          </p>
        )}

        {[...grouped.entries()].map(([group, list]) => (
          <div key={group} className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group}
            </h3>
            <div className="grid gap-2 md:grid-cols-2">
              {list
                .sort((a, b) => b.score - a.score)
                .map((t) => (
                  <TraitCard key={t.id} trait={t} compareScore={compareByTraitId.get(t.id)} />
                ))}
            </div>
          </div>
        ))}

        {(profile.strengths.length > 0 || profile.weaknesses.length > 0) && (
          <div className="grid gap-3 md:grid-cols-2">
            {profile.strengths.length > 0 && (
              <div className="rounded-md border p-3">
                <p className="text-xs font-semibold flex items-center gap-1 text-emerald-600">
                  <TrendingUp className="size-3" /> Pontos Fortes
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {profile.strengths.map((t) => (
                    <li key={t.id} className="flex justify-between gap-2">
                      <span>
                        {t.label}
                        {t.level ? ` (${t.level})` : ""}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {t.score.toFixed(0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {profile.weaknesses.length > 0 && (
              <div className="rounded-md border p-3">
                <p className="text-xs font-semibold flex items-center gap-1 text-red-600">
                  <TrendingDown className="size-3" /> Pontos Fracos
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {profile.weaknesses.map((t) => (
                    <li key={t.id} className="flex justify-between gap-2">
                      <span>
                        {t.label}
                        {t.level ? ` (${t.level})` : ""}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {t.score.toFixed(0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {profile.narrative.length > 0 && (
          <details className="group rounded-md border bg-muted/20 open:bg-muted/30 transition-colors">
            <summary className="cursor-pointer list-none p-3 flex items-center justify-between gap-2 text-xs font-semibold">
              <span className="flex items-center gap-1">
                <Sparkles className="size-3" /> Narrativa
                <span className="ml-2 font-normal text-muted-foreground">
                  {profile.narrative.length} {profile.narrative.length === 1 ? "parágrafo" : "parágrafos"}
                </span>
              </span>
              <span className="text-muted-foreground text-[10px] uppercase tracking-wide group-open:hidden">
                Expandir
              </span>
              <span className="text-muted-foreground text-[10px] uppercase tracking-wide hidden group-open:inline">
                Recolher
              </span>
            </summary>
            <div className="space-y-2 text-sm leading-relaxed px-3 pb-3">
              {profile.narrative.map((p, i) => (
                <p
                  key={i}
                  dangerouslySetInnerHTML={{
                    __html: p.text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                  }}
                />
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
