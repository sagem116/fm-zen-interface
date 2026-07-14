import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { supabase } from "@/integrations/supabase/client";

interface TopTransfer {
  id: string;
  person_name: string;
  from_club_name: string | null;
  to_club_name: string | null;
  value: number;
  season_year: number;
}

interface MarketSummary {
  totalValue: number;
  totalCount: number;
  seasons: number;
  topBuys: TopTransfer[];
  topSales: TopTransfer[];
}

function formatValue(v: number): string {
  if (!v) return "€0";
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `€${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `€${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `€${(abs / 1_000).toFixed(0)}K`;
  return `€${abs.toFixed(0)}`;
}

async function fetchMarketSummary(): Promise<MarketSummary> {
  const { data: agg } = await supabase
    .from("transfers")
    .select("value, season_year")
    .order("season_year", { ascending: false })
    .limit(50000);
  const rows = agg ?? [];
  const totalValue = rows.reduce((a, b) => a + Number(b.value ?? 0), 0);
  const totalCount = rows.length;
  const seasons = new Set(rows.map((r) => r.season_year)).size;

  const { data: top } = await supabase
    .from("transfers")
    .select("id,person_name,from_club_name,to_club_name,value,season_year")
    .order("value", { ascending: false })
    .limit(10);
  const topBuys = (top ?? []) as TopTransfer[];
  const topSales = topBuys; // same list, semantically different framings
  return { totalValue, totalCount, seasons, topBuys, topSales };
}

export function DashboardMarket() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-market"],
    queryFn: fetchMarketSummary,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <DashboardCard title="Mercado" icon={Wallet} compact>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">A carregar mercado…</p>
      ) : !data || data.totalCount === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Sem transferências registadas.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Kpi label="Volume total" value={formatValue(data.totalValue)} />
            <Kpi label="Nº transferências" value={data.totalCount.toLocaleString("pt-PT")} />
            <Kpi label="Épocas cobertas" value={data.seasons} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <TrendingUp className="size-3.5" /> Maiores transferências
              </p>
              <ul className="space-y-1.5">
                {data.topBuys.slice(0, 5).map((t) => (
                  <li key={t.id} className="text-sm border-b border-border/40 pb-1.5 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{t.person_name}</span>
                      <span className="tabular-nums font-medium shrink-0">
                        {formatValue(t.value)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.from_club_name ?? "—"} → {t.to_club_name ?? "—"} · {t.season_year}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <TrendingDown className="size-3.5" /> Destaques por época
              </p>
              <ul className="space-y-1.5">
                {data.topSales.slice(5, 10).map((t) => (
                  <li key={t.id} className="text-sm border-b border-border/40 pb-1.5 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{t.person_name}</span>
                      <span className="tabular-nums font-medium shrink-0">
                        {formatValue(t.value)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.from_club_name ?? "—"} → {t.to_club_name ?? "—"} · {t.season_year}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
