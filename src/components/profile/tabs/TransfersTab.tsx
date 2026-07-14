import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, TrendingUp, ArrowUpRight, ArrowDownRight, Scale } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  fetchTransfersByClub,
  fetchTransfersByPerson,
  normalizeKey,
  type TransferListRow,
} from "@/lib/fm-transfers";
import { fetchCoachFullData } from "@/lib/fm-coach-full";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProfileContext } from "@/lib/profile/types";

function formatValue(v: number): string {
  if (!v) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}€${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}€${(abs / 1_000).toFixed(0)}K`;
  return `${sign}€${abs.toFixed(0)}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-PT");
  } catch {
    return iso;
  }
}

interface TransferQueryResult {
  rows: TransferListRow[];
  /** For coaches: for each season year, the set of normalized club keys the coach was at. */
  coachSeasonClubKeys: Map<number, Set<string>>;
}

export function TransfersTab({ ctx }: { ctx: ProfileContext }) {
  const isClub = ctx.kind === "club";
  const isCoach = ctx.kind === "coach";
  const [selectedSeason, setSelectedSeason] = useState<string>("all");

  const { data, isLoading } = useQuery<TransferQueryResult>({
    queryKey: ["transfers", ctx.kind, ctx.name],
    queryFn: async () => {
      if (isClub) {
        const rows = await fetchTransfersByClub(ctx.name);
        return { rows, coachSeasonClubKeys: new Map() };
      }
      if (isCoach) {
        const personTransfers = await fetchTransfersByPerson(ctx.name, "coach");
        const full = await fetchCoachFullData(ctx.name);
        const clubs = Array.from(
          new Set(full.assignments.map((a) => a.club_name).filter(Boolean)),
        ) as string[];
        const clubTransfersArr = await Promise.all(clubs.map((c) => fetchTransfersByClub(c)));

        const seasonByClub = new Map<number, Set<string>>();
        const seasonClubKeys = new Map<number, Set<string>>();
        for (const a of full.assignments) {
          if (!a.season_year || !a.club_name) continue;
          const s = a.season_year;
          const namesSet = seasonByClub.get(s) ?? new Set<string>();
          namesSet.add(a.club_name);
          seasonByClub.set(s, namesSet);

          const keysSet = seasonClubKeys.get(s) ?? new Set<string>();
          keysSet.add(normalizeKey(a.club_name));
          seasonClubKeys.set(s, keysSet);
        }

        const clubTransfersFiltered: TransferListRow[] = [];
        for (const arr of clubTransfersArr) {
          for (const t of arr) {
            const namesSet = seasonByClub.get(t.season_year);
            if (
              namesSet &&
              ((t.from_club_name && namesSet.has(t.from_club_name)) ||
                (t.to_club_name && namesSet.has(t.to_club_name)))
            ) {
              clubTransfersFiltered.push(t);
            }
          }
        }
        const combined = [...personTransfers, ...clubTransfersFiltered];
        const seen = new Set<string>();
        const out: TransferListRow[] = [];
        for (const r of combined) {
          if (!seen.has(r.id)) {
            seen.add(r.id);
            out.push(r);
          }
        }
        out.sort((a, b) => (b.transfer_date || "").localeCompare(a.transfer_date || ""));
        return { rows: out, coachSeasonClubKeys: seasonClubKeys };
      }
      return { rows: [], coachSeasonClubKeys: new Map() };
    },
    enabled: isClub || isCoach,
  });

  const rows = data?.rows ?? [];
  const seasons = Array.from(new Set(rows.map((r) => r.season_year)))
    .filter(Boolean)
    .sort((a, b) => b - a) as number[];
  const filteredRows =
    selectedSeason === "all" ? rows : rows.filter((r) => r.season_year === Number(selectedSeason));
  const clubKey = isClub ? normalizeKey(ctx.name) : "";
  const coachSeasonClubKeys = data?.coachSeasonClubKeys ?? new Map<number, Set<string>>();

  /** For a given row, determine direction (in/out) relative to the profile context. */
  const rowDirection = (r: TransferListRow): "in" | "out" | null => {
    if (isClub) {
      if (r.to_club_name && normalizeKey(r.to_club_name) === clubKey) return "in";
      if (r.from_club_name && normalizeKey(r.from_club_name) === clubKey) return "out";
      return null;
    }
    if (isCoach) {
      // Person-scope coach transfers: use to/from as the coach's move.
      if (r.person_type === "coach") {
        return r.to_club_name ? "in" : r.from_club_name ? "out" : null;
      }
      // Player transfers of the coach's club in that season.
      const keys = coachSeasonClubKeys.get(r.season_year);
      if (!keys) return null;
      if (r.to_club_name && keys.has(normalizeKey(r.to_club_name))) return "in";
      if (r.from_club_name && keys.has(normalizeKey(r.from_club_name))) return "out";
    }
    return null;
  };

  const record = useMemo(() => {
    if (!filteredRows.length) return null;
    return filteredRows.reduce(
      (best: TransferListRow | null, r) => (!best || r.value > best.value ? r : best),
      null as TransferListRow | null,
    );
  }, [filteredRows]);

  const stats = useMemo(() => {
    if (!isClub && !isCoach) return null;
    let arrivals = 0;
    let departures = 0;
    let spent = 0;
    let earned = 0;
    for (const r of filteredRows) {
      // For coaches, exclude the coach's own personal move rows from arrivals/departures counts of players
      const effective =
        isCoach && r.person_type === "coach" ? null : rowDirection(r);
      if (effective === "in") {
        arrivals++;
        spent += r.value;
      } else if (effective === "out") {
        departures++;
        earned += r.value;
      }
    }
    return { arrivals, departures, spent, earned, balance: earned - spent };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRows, isClub, isCoach, clubKey, coachSeasonClubKeys]);

  const seasonEvolution = useMemo(() => {
    if (!stats) return [] as Array<{ season: number; gasto: number; recebido: number; saldo: number }>;
    const perSeason = new Map<number, { gasto: number; recebido: number }>();
    for (const r of rows) {
      if (isCoach && r.person_type === "coach") continue;
      const dir = rowDirection(r);
      if (!dir) continue;
      const bucket = perSeason.get(r.season_year) ?? { gasto: 0, recebido: 0 };
      if (dir === "in") bucket.gasto += r.value;
      else bucket.recebido += r.value;
      perSeason.set(r.season_year, bucket);
    }
    return Array.from(perSeason.entries())
      .map(([season, v]) => ({
        season,
        gasto: v.gasto,
        recebido: v.recebido,
        saldo: v.recebido - v.gasto,
      }))
      .sort((a, b) => a.season - b.season);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, isClub, isCoach, clubKey, coachSeasonClubKeys, stats]);

  const narrative = useMemo(() => {
    if (!stats || stats.arrivals + stats.departures === 0) return null;
    const subject = isCoach ? "Este treinador" : "Este clube";
    const total = stats.spent + stats.earned;
    const spendShare = total > 0 ? stats.spent / total : 0;
    const balance = stats.balance;
    const parts: string[] = [];

    if (spendShare > 0.7) {
      parts.push(
        `${subject} tem um perfil marcadamente comprador: ${stats.arrivals} contratações contra ${stats.departures} saídas, com investimento superior ao encaixe de vendas.`,
      );
    } else if (spendShare < 0.3) {
      parts.push(
        `${subject} tem um perfil predominantemente vendedor: ${stats.departures} saídas geraram receita muito acima do gasto em ${stats.arrivals} reforços.`,
      );
    } else {
      parts.push(
        `${subject} apresenta uma política de mercado equilibrada, com ${stats.arrivals} entradas e ${stats.departures} saídas em volume financeiro comparável.`,
      );
    }

    if (Math.abs(balance) > 0) {
      parts.push(
        balance > 0
          ? `O balanço líquido é positivo em ${formatValue(balance)}, sinal de eficiência a rentabilizar activos.`
          : `O balanço líquido é negativo em ${formatValue(-balance)}, refletindo aposta em reforçar o plantel.`,
      );
    }

    // Trend: compare last two seasons visible
    if (seasonEvolution.length >= 2) {
      const [prev, cur] = seasonEvolution.slice(-2);
      const dSpent = cur.gasto - prev.gasto;
      if (Math.abs(dSpent) > 1_000_000) {
        parts.push(
          dSpent > 0
            ? `Na última época, o investimento em contratações subiu face à anterior.`
            : `Na última época, o investimento em contratações recuou face à anterior.`,
        );
      }
    }

    return parts.join(" ");
  }, [stats, isCoach, seasonEvolution]);

  if (!isClub && !isCoach) {
    return (
      <p className="text-sm text-muted-foreground">
        Sem transferências para este tipo de perfil.
      </p>
    );
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
                {record.person_name} ({record.from_club_name ?? "—"} → {record.to_club_name ?? "—"})
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(record.transfer_date)} · Época {record.season_year}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {stats ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Chegadas" value={stats.arrivals} icon={ArrowDownRight} />
          <StatCard label="Saídas" value={stats.departures} icon={ArrowUpRight} />
          <StatCard label="Gasto" value={formatValue(stats.spent)} />
          <StatCard label="Recebido" value={formatValue(stats.earned)} />
          <StatCard
            label="Saldo"
            value={formatValue(stats.balance)}
            icon={Scale}
            tone={stats.balance >= 0 ? "positive" : "negative"}
          />
        </div>
      ) : null}

      {narrative ? (
        <Card>
          <CardContent className="pt-4 text-sm leading-relaxed text-muted-foreground">
            {narrative}
          </CardContent>
        </Card>
      ) : null}

      {seasonEvolution.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" /> Evolução por época
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seasonEvolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="season" stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) => formatValue(v as number)}
                    width={70}
                  />
                  <Tooltip
                    formatter={(v: number) => formatValue(v)}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="gasto" name="Gasto" fill="hsl(var(--destructive))" />
                  <Bar dataKey="recebido" name="Recebido" fill="hsl(var(--primary))" />
                  <Bar dataKey="saldo" name="Saldo" fill="hsl(var(--gold, var(--primary)))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
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
                      <SelectItem key={s} value={String(s)}>
                        {s}
                      </SelectItem>
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
                  const direction = rowDirection(r);
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
                            <Badge variant="secondary" className="text-[10px]">
                              Chegada
                            </Badge>
                          )}
                          {direction === "out" && (
                            <Badge variant="outline" className="text-[10px]">
                              Saída
                            </Badge>
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
  icon: Icon,
}: {
  label: string;
  value: string | number;
  tone?: "positive" | "negative";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase text-muted-foreground">{label}</p>
        {Icon ? <Icon className="size-3.5 text-muted-foreground" /> : null}
      </div>
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
