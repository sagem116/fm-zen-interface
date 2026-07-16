import { useMemo } from "react";
import { Loader2, ArrowDownRight, ArrowUpRight, Coins, Percent } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProfileContext } from "@/lib/profile/types";
import { useCoachRoster } from "@/lib/coach-identity/data";
import { useCoachTransfers, computeTransferMetrics, type TransferPreferences } from "@/lib/coach-identity/transfers";

const fmtInt = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("pt-PT") : "—");
const fmtNum = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : "—");
const fmtMoney = (n: number) => {
  if (!Number.isFinite(n) || n === 0) return "€0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}€${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}€${(abs / 1_000).toFixed(0)}K`;
  return `${sign}€${abs.toFixed(0)}`;
};

function PreferencesCard({
  title,
  prefs,
}: {
  title: string;
  prefs: TransferPreferences;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-y-1.5">
          <span className="text-muted-foreground">Movimentos</span>
          <span className="text-right tabular-nums">{prefs.count}</span>
          <span className="text-muted-foreground">Valor total</span>
          <span className="text-right tabular-nums">{fmtMoney(prefs.totalValue)}</span>
          <span className="text-muted-foreground">Valor médio</span>
          <span className="text-right tabular-nums">{fmtMoney(prefs.avgValue)}</span>
          <span className="text-muted-foreground">Livres</span>
          <span className="text-right tabular-nums">{prefs.freeAgents}</span>
          <span className="text-muted-foreground">Idade média</span>
          <span className="text-right tabular-nums">{fmtNum(prefs.avgAge)}</span>
          <span className="text-muted-foreground">CA médio</span>
          <span className="text-right tabular-nums">{fmtInt(prefs.avgCa)}</span>
          <span className="text-muted-foreground">PA médio</span>
          <span className="text-right tabular-nums">{fmtInt(prefs.avgCp)}</span>
          <span className="text-muted-foreground">Altura média</span>
          <span className="text-right tabular-nums">{fmtNum(prefs.avgHeight)} cm</span>
          <span className="text-muted-foreground">Peso médio</span>
          <span className="text-right tabular-nums">{fmtNum(prefs.avgWeight)} kg</span>
        </div>
        {prefs.positions.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1.5">Distribuição por posição</div>
            <div className="space-y-1">
              {prefs.positions.map((p) => (
                <div key={p.label} className="flex items-center gap-2 text-xs">
                  <span className="w-24 truncate">{p.label}</span>
                  <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${p.pct}%` }} />
                  </div>
                  <span className="w-16 text-right tabular-nums">
                    {p.count} ({fmtNum(p.pct, 0)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t">
          <div>
            <div className="text-sm font-semibold tabular-nums">{fmtNum(prefs.feet.right, 0)}%</div>
            <div className="text-[10px] text-muted-foreground">Destros</div>
          </div>
          <div>
            <div className="text-sm font-semibold tabular-nums">{fmtNum(prefs.feet.left, 0)}%</div>
            <div className="text-[10px] text-muted-foreground">Canhotos</div>
          </div>
          <div>
            <div className="text-sm font-semibold tabular-nums">{fmtNum(prefs.feet.ambi, 0)}%</div>
            <div className="text-[10px] text-muted-foreground">Ambi</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CoachTransfersTab({ ctx }: { ctx: ProfileContext }) {
  const { data: roster, isLoading: rosterLoading } = useCoachRoster(ctx.name);
  const { data: transfers, isLoading: trLoading } = useCoachTransfers(
    ctx.name,
    roster?.assignments,
  );

  const metrics = useMemo(
    () => (roster && transfers ? computeTransferMetrics(transfers, roster.players) : null),
    [roster, transfers],
  );

  if (rosterLoading || trLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!metrics || (metrics.totalArrivals === 0 && metrics.totalDepartures === 0)) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Sem transferências associadas a este treinador nas épocas registadas.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <ArrowDownRight className="h-3.5 w-3.5" /> Entradas
            </div>
            <div className="text-2xl font-bold tabular-nums">{metrics.totalArrivals}</div>
            <div className="text-xs text-muted-foreground">Gasto {fmtMoney(metrics.spent)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <ArrowUpRight className="h-3.5 w-3.5" /> Saídas
            </div>
            <div className="text-2xl font-bold tabular-nums">{metrics.totalDepartures}</div>
            <div className="text-xs text-muted-foreground">Recebido {fmtMoney(metrics.received)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Coins className="h-3.5 w-3.5" /> Saldo líquido
            </div>
            <div
              className={`text-2xl font-bold tabular-nums ${
                metrics.netBalance >= 0 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {fmtMoney(metrics.netBalance)}
            </div>
            <div className="text-xs text-muted-foreground">Recebido − gasto</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Percent className="h-3.5 w-3.5" /> Sucesso das contratações
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {fmtNum(metrics.efficiency.successRate, 0)}%
            </div>
            <div className="text-xs text-muted-foreground">
              Δ CA médio {metrics.efficiency.avgCaGain >= 0 ? "+" : ""}
              {fmtNum(metrics.efficiency.avgCaGain, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preferences */}
      <div className="grid gap-4 md:grid-cols-2">
        <PreferencesCard title="Perfil das entradas" prefs={metrics.arrivals} />
        <PreferencesCard title="Perfil das saídas" prefs={metrics.departures} />
      </div>

      {/* Efficiency lists */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Melhores contratações</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.efficiency.top.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados suficientes.</p>
            ) : (
              <div className="space-y-1">
                {metrics.efficiency.top.map((e, i) => (
                  <div
                    key={`${e.name}-${i}`}
                    className="flex items-center gap-3 text-sm py-1 border-b last:border-b-0"
                  >
                    <span className="flex-1 truncate">{e.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {e.arrivalYear}
                    </span>
                    <span className="w-28 text-right tabular-nums">
                      {fmtInt(e.arrivalCa)} → {fmtInt(e.latestCa)}
                    </span>
                    <Badge variant="outline" className="w-14 justify-center">
                      {e.caGain > 0 ? "+" : ""}
                      {fmtInt(e.caGain)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contratações menos rentáveis</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.efficiency.poor.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados suficientes.</p>
            ) : (
              <div className="space-y-1">
                {metrics.efficiency.poor.map((e, i) => (
                  <div
                    key={`${e.name}-${i}`}
                    className="flex items-center gap-3 text-sm py-1 border-b last:border-b-0"
                  >
                    <span className="flex-1 truncate">{e.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {e.arrivalYear}
                    </span>
                    <span className="w-28 text-right tabular-nums">
                      {fmtInt(e.arrivalCa)} → {fmtInt(e.latestCa)}
                    </span>
                    <Badge variant="outline" className="w-14 justify-center">
                      {e.caGain > 0 ? "+" : ""}
                      {fmtInt(e.caGain)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
