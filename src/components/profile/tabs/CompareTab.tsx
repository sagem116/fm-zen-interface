import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityCombobox } from "@/components/EntityCombobox";
import { fmtPts } from "@/lib/fmt";
import type { ProfileContext } from "@/lib/profile/types";
import { usePlayerUniverse } from "@/lib/player-universe";

export function CompareTab({ ctx }: { ctx: ProfileContext }) {
  const universe = usePlayerUniverse();
  const options = useMemo(() => optionsFor(ctx, universe.list ?? []), [ctx, universe.list]);
  const [other, setOther] = useState("");
  const otherStats = useMemo(() => (other ? aggregateFor(ctx, other) : null), [ctx, other]);
  const selfStats = useMemo(() => aggregateFor(ctx, ctx.name), [ctx]);
  const canFullCompare = ctx.kind === "club" || ctx.kind === "coach" || ctx.kind === "country";

  if (!options.length) {
    return (
      <p className="text-sm text-muted-foreground">Comparação não disponível para esta entidade.</p>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparar com…</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <EntityCombobox
              value={other}
              onChange={setOther}
              options={options.filter((o) => o !== ctx.name)}
              placeholder={`Escolher ${labelFor(ctx.kind)}…`}
            />
            {canFullCompare && (
              <Button asChild variant="outline">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Link to={"/comparar" as any} search={true}>
                  <GitCompareArrows className="size-4 mr-1" /> Comparação completa
                </Link>
              </Button>
            )}
          </div>
          {other && otherStats && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div />
              <div className="text-xs uppercase tracking-wide text-muted-foreground text-center">
                {ctx.name}
              </div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground text-center">
                {other}
              </div>
              <Row label="Pontos" a={selfStats?.raw} b={otherStats.raw} />
              <Row label="Ranking" a={selfStats?.rank} b={otherStats.rank} prefix="#" />
              <Row label="Títulos" a={selfStats?.titles} b={otherStats.titles} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  a,
  b,
  prefix = "",
}: {
  label: string;
  a: number | null | undefined;
  b: number | null | undefined;
  prefix?: string;
}) {
  return (
    <>
      <div className="text-muted-foreground text-xs uppercase tracking-wide">{label}</div>
      <div className="tabular-nums text-center font-semibold">
        {a == null
          ? "—"
          : `${prefix}${typeof a === "number" && !Number.isInteger(a) ? fmtPts(a) : a}`}
      </div>
      <div className="tabular-nums text-center font-semibold">
        {b == null
          ? "—"
          : `${prefix}${typeof b === "number" && !Number.isInteger(b) ? fmtPts(b) : b}`}
      </div>
    </>
  );
}

function labelFor(kind: ProfileContext["kind"]) {
  return kind === "club"
    ? "clube"
    : kind === "coach"
      ? "treinador"
      : kind === "country"
        ? "país"
        : kind === "player"
          ? "jogador"
          : "competição";
}

function optionsFor(
  ctx: ProfileContext,
  universePlayers: Array<{ name: string }> = [],
): string[] {
  const { data } = ctx;
  if (ctx.kind === "club") return data.ranks.clubs.map((c) => c.name);
  if (ctx.kind === "coach") return data.ranks.coaches.map((c) => c.name);
  if (ctx.kind === "country") return data.ranks.countries.map((c) => c.name);
  if (ctx.kind === "player") {
    const set = new Set<string>();
    for (const p of data.data.players ?? []) if (p.name) set.add(p.name);
    for (const p of universePlayers) if (p?.name) set.add(p.name);
    return [...set].sort();
  }
  const set = new Set<string>();
  for (const s of data.data.standings) if (s.competition) set.add(s.competition);
  return [...set].sort();
}

function aggregateFor(ctx: ProfileContext, name: string) {
  const { data } = ctx;
  if (ctx.kind === "club") {
    const idx = data.ranks.clubs.findIndex((c) => c.name === name);
    const e = data.ranks.clubs[idx];
    return e ? { raw: e.raw, rank: idx + 1, titles: e.titles } : null;
  }
  if (ctx.kind === "coach") {
    const idx = data.ranks.coaches.findIndex((c) => c.name === name);
    const e = data.ranks.coaches[idx];
    return e ? { raw: e.raw, rank: idx + 1, titles: e.titles } : null;
  }
  if (ctx.kind === "country") {
    const idx = data.ranks.countries.findIndex((c) => c.name === name);
    const e = data.ranks.countries[idx];
    return e ? { raw: e.raw, rank: idx + 1, titles: e.titles } : null;
  }
  return null;
}
