import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  fetchTransfersByClub,
  fetchTransfersByPerson,
  normalizeKey,
  type TransferListRow,
} from "@/lib/fm-transfers";
import { fetchCoachFullData } from "@/lib/fm-coach-full";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProfileContext } from "@/lib/profile/types";

function formatValue(v: number): string {
  if (!v) return "—";
  if (Math.abs(v) >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v.toFixed(0)}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-PT");
  } catch {
    return iso;
  }
}

export function TransfersTab({ ctx }: { ctx: ProfileContext }) {
  const isClub = ctx.kind === "club";
  const isCoach = ctx.kind === "coach";
  const [selectedSeason, setSelectedSeason] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["transfers", ctx.kind, ctx.name],
    queryFn: async () => {
      if (isClub) return fetchTransfersByClub(ctx.name);
      if (isCoach) {
        const personTransfers = await fetchTransfersByPerson(ctx.name, "coach");
        // Also include transfers of clubs the coach was assigned to in the relevant seasons
        const full = await fetchCoachFullData(ctx.name);
        const clubs = Array.from(new Set(full.assignments.map((a) => a.club_name).filter(Boolean)));
        const clubTransfersArr = await Promise.all(clubs.map((c) => fetchTransfersByClub(c!)));
        // Filter club transfers to seasons where the coach was at that club
        const clubTransfersFiltered: TransferListRow[] = [];
        const seasonByClub = new Map<number, Set<string>>();
        for (const a of full.assignments) {
          if (!a.season_year || !a.club_name) continue;
          const s = a.season_year;
          const set = seasonByClub.get(s) ?? new Set<string>();
          set.add(a.club_name);
          seasonByClub.set(s, set);
        }
        for (const arr of clubTransfersArr) {
          for (const t of arr) {
            const set = seasonByClub.get(t.season_year);
            if (set && (t.from_club_name && set.has(t.from_club_name) || t.to_club_name && set.has(t.to_club_name))) {
              clubTransfersFiltered.push(t);
            }
          }
        }
        const combined = [...personTransfers, ...clubTransfersFiltered];
        // dedupe by id
        const seen = new Set<string>();
        const out: TransferListRow[] = [];
        for (const r of combined) {
          if (!seen.has(r.id)) {
            seen.add(r.id);
            out.push(r);
          }
        }
        return out.sort((a, b) => (b.transfer_date || "").localeCompare(a.transfer_date || ""));
      }
      return [];
    },
    enabled: isClub || isCoach,
  });

  const rows = data ?? [];
  const seasons = Array.from(new Set(rows.map((r) => r.season_year))).filter(Boolean).sort((a, b) => b - a) as number[];
  const filteredRows = selectedSeason === "all" ? rows : rows.filter((r) => r.season_year === Number(selectedSeason));
  const clubKey = isClub ? normalizeKey(ctx.name) : "";

  const record = useMemo(() => {
    if (!filteredRows.length) return null;
    return filteredRows.reduce((best: TransferListRow | null, r) => (!best || r.value > best.value ? r : best), null as TransferListRow | null);
  }, [filteredRows]);

  const stats = useMemo(() => {
    if (!isClub) return null;
    let arrivals = 0;
    let departures = 0;
    let spent = 0;
    let earned = 0;
    for (const r of filteredRows) {
      if (r.to_club_name && normalizeKey(r.to_club_name) === clubKey) {
        arrivals++;
        spent += r.value;
      }
      if (r.from_club_name && normalizeKey(r.from_club_name) === clubKey) {
        departures++;
        earned += r.value;
      }
    }
    return { arrivals, departures, spent, earned, balance: earned - spent };
  }, [filteredRows, isClub, clubKey]);

  if (!isClub && !isCoach) {
    return <p className="text-sm text-muted-foreground">Sem transferências para este tipo de perfil.</p>;
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">A carregar transferências…</p>;
  }

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">Sem transferências registadas.</p>;
  }

  return (
    <div className="space-y-4">
      {record ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="size-4 text-gold" /> Recorde all-time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-2xl font-bold tabular-nums">{formatValue(record.value)}</span>
              <span className="text-sm">
                {record.person_name}
                {isClub ? (
                  <>
                    {" "}
                    ({record.from_club_name ?? "—"} → {record.to_club_name ?? "—"})
                  </>
                ) : null}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(record.transfer_date)} · Época {record.season_year}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Chegadas" value={stats.arrivals} />
          <StatCard label="Saídas" value={stats.departures} />
          <StatCard label="Gasto" value={formatValue(stats.spent)} />
          <StatCard
            label="Saldo"
            value={formatValue(stats.balance)}
            tone={stats.balance >= 0 ? "positive" : "negative"}
          />
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowLeftRight className="size-4 text-primary" /> Histórico de transferências
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="flex items-end gap-3 mb-3">
              <div className="flex-1 max-w-xs">
                <label className="text-xs text-muted-foreground">Época</label>
                <Select value={selectedSeason} onValueChange={(v) => setSelectedSeason(v)}>
                  <SelectTrigger className="w-[140px] mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={"all"}>Todas</SelectItem>
                    {seasons.map((s) => (
                      <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Época</th>
                  <th className="py-2 pr-3">Pessoa</th>
                  <th className="py-2 pr-3">De</th>
                  <th className="py-2 pr-3">Para</th>
                  <th className="py-2 pr-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, 200).map((r) => {
                  const direction = isClub
                    ? r.to_club_name && normalizeKey(r.to_club_name) === clubKey
                      ? "in"
                      : "out"
                    : null;
                  return (
                    <tr key={r.id} className="border-b border-border/40">
                      <td className="py-2 pr-3 tabular-nums text-muted-foreground">
                        {formatDate(r.transfer_date)}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{r.season_year}</td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          {r.person_name}
                          {direction === "in" && (
                            <Badge variant="secondary" className="text-[10px]">Chegada</Badge>
                          )}
                          {direction === "out" && (
                            <Badge variant="outline" className="text-[10px]">Saída</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{r.from_club_name ?? "—"}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{r.to_club_name ?? "—"}</td>
                      <td className="py-2 pr-3 text-right tabular-nums font-medium">
                        {formatValue(r.value)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length > 200 ? (
              <p className="text-xs text-muted-foreground mt-2">
                A mostrar 200 de {rows.length} transferências.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p
        className={`text-lg font-semibold tabular-nums ${
          tone === "positive" ? "text-success" : tone === "negative" ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
