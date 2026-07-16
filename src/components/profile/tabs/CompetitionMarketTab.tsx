import { useMemo } from "react";
import {
  Loader2,
  ArrowLeftRight,
  TrendingUp,
  Users,
  MapPin,
  Building2,
  Globe2,
  Cake,
  BarChart3,
  Target,
  Sparkles,
  Repeat,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";
import type { ProfileContext } from "@/lib/profile/types";
import { useCompetitionMarket } from "@/lib/competition-market/data";
import {
  computeFlow,
  computeOriginDestination,
  computeActiveClubs,
  type DimensionRow,
  type ClubActivity,
} from "@/lib/competition-market/compute";
import {
  computeNationalities,
  computeAgeProfile,
  computeTechnicalProfile,
  computePositionalProfile,
  computePersonalProfile,
  computeInternalExternal,
  type Bucket,
} from "@/lib/competition-market/profile";

const fmtInt = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("pt-PT") : "—");
const fmtNum = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : "—");
const fmtMoney = (n: number) => {
  if (!Number.isFinite(n) || n === 0) return "€0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}€${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}€${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}€${(abs / 1_000).toFixed(0)}K`;
  return `${sign}€${abs.toFixed(0)}`;
};

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof ArrowLeftRight;
  label: string;
  value: string;
  hint?: string;
  tone?: "pos" | "neg";
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Icon className="h-3.5 w-3.5" /> {label}
        </div>
        <div
          className={`text-2xl font-bold tabular-nums ${
            tone === "pos" ? "text-emerald-500" : tone === "neg" ? "text-rose-500" : ""
          }`}
        >
          {value}
        </div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function DimensionTable({ rows, valueLabel = "Investido" }: { rows: DimensionRow[]; valueLabel?: string }) {
  if (!rows.length) return <p className="text-xs text-muted-foreground">Sem dados.</p>;
  const top = rows.slice(0, 15);
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[1fr_60px_60px_90px_90px] gap-2 text-[11px] font-medium text-muted-foreground px-1 pb-1 border-b">
        <span>Nome</span>
        <span className="text-right">Nº</span>
        <span className="text-right">%</span>
        <span className="text-right">{valueLabel}</span>
        <span className="text-right">Valor médio</span>
      </div>
      {top.map((r) => (
        <div
          key={r.key}
          className="grid grid-cols-[1fr_60px_60px_90px_90px] gap-2 text-xs items-center py-1 border-b last:border-b-0"
        >
          <span className="truncate">{r.label}</span>
          <span className="text-right tabular-nums">{r.count}</span>
          <span className="text-right tabular-nums text-muted-foreground">
            {fmtNum(r.pct, 0)}%
          </span>
          <span className="text-right tabular-nums">{fmtMoney(r.value)}</span>
          <span className="text-right tabular-nums text-muted-foreground">
            {fmtMoney(r.avgValue)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ActiveClubsTable({ rows, mode }: { rows: ClubActivity[]; mode: keyof ClubActivity }) {
  const sorted = [...rows]
    .sort((a, b) => Number(b[mode]) - Number(a[mode]))
    .slice(0, 15);
  return (
    <div className="space-y-1">
      {sorted.map((r) => (
        <div key={r.club} className="grid grid-cols-[1fr_70px_70px_90px_90px] gap-2 text-xs items-center py-1 border-b last:border-b-0">
          <span className="truncate">{r.club}</span>
          <span className="text-right tabular-nums">{r.buys}c / {r.sales}v</span>
          <span className="text-right tabular-nums">{fmtMoney(r.spent)}</span>
          <span className="text-right tabular-nums">{fmtMoney(r.received)}</span>
          <Badge
            variant="outline"
            className={`justify-end tabular-nums ${
              r.balance >= 0 ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {fmtMoney(r.balance)}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function BucketTable({ rows, showAvg = true }: { rows: Bucket[]; showAvg?: boolean }) {
  if (!rows.length) return <p className="text-xs text-muted-foreground">Sem dados suficientes.</p>;
  const top = rows.slice(0, 15);
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[1fr_60px_60px_60px_60px] gap-2 text-[11px] font-medium text-muted-foreground px-1 pb-1 border-b">
        <span>Categoria</span>
        <span className="text-right">Compras</span>
        <span className="text-right">%C</span>
        <span className="text-right">Vendas</span>
        <span className="text-right">%V</span>
      </div>
      {top.map((r) => (
        <div key={r.key} className="grid grid-cols-[1fr_60px_60px_60px_60px] gap-2 text-xs items-center py-1 border-b last:border-b-0">
          <span className="truncate">{r.label}</span>
          <span className="text-right tabular-nums">{r.buys}</span>
          <span className="text-right tabular-nums text-muted-foreground">{fmtNum(r.buysPct, 0)}%</span>
          <span className="text-right tabular-nums">{r.sales}</span>
          <span className="text-right tabular-nums text-muted-foreground">{fmtNum(r.salesPct, 0)}%</span>
        </div>
      ))}
      {showAvg && top.some((r) => r.avgBuyValue || r.avgSaleValue) && (
        <p className="text-[10px] text-muted-foreground pt-1">Valores médios visíveis passando o rato nos gráficos.</p>
      )}
    </div>
  );
}

export function CompetitionMarketTab({ ctx }: { ctx: ProfileContext }) {
  const { data: m, isLoading } = useCompetitionMarket(ctx.name);
  const flow = useMemo(() => (m ? computeFlow(m) : null), [m]);
  const od = useMemo(() => (m ? computeOriginDestination(m) : null), [m]);
  const clubs = useMemo(() => (m ? computeActiveClubs(m) : []), [m]);
  const nat = useMemo(() => (m ? computeNationalities(m) : null), [m]);
  const age = useMemo(() => (m ? computeAgeProfile(m) : null), [m]);
  const tech = useMemo(() => (m ? computeTechnicalProfile(m) : null), [m]);
  const pos = useMemo(() => (m ? computePositionalProfile(m) : null), [m]);
  const perso = useMemo(() => (m ? computePersonalProfile(m) : null), [m]);
  const inout = useMemo(() => (m ? computeInternalExternal(m) : null), [m]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!m || !flow || m.transfers.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Sem transferências associadas a esta competição.
        </CardContent>
      </Card>
    );
  }
  const t = flow.total;
  return (
    <div className="space-y-6">
      {/* Section 2 — Fluxo Global */}
      <section>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4" /> Fluxo Global
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={ArrowLeftRight} label="Compras" value={fmtInt(t.buys)} hint={`Média ${fmtMoney(t.avgBuyValue)}`} />
          <KpiCard icon={ArrowLeftRight} label="Vendas" value={fmtInt(t.sales)} hint={`Média ${fmtMoney(t.avgSaleValue)}`} />
          <KpiCard
            icon={Users}
            label="Saldo de jogadores"
            value={t.playerBalance > 0 ? `+${t.playerBalance}` : String(t.playerBalance)}
            hint={`${t.buys} entradas · ${t.sales} saídas`}
            tone={t.playerBalance >= 0 ? "pos" : "neg"}
          />
          <KpiCard
            icon={TrendingUp}
            label="Saldo financeiro"
            value={fmtMoney(t.financialBalance)}
            hint={`Recebido ${fmtMoney(t.received)} · Gasto ${fmtMoney(t.spent)}`}
            tone={t.financialBalance >= 0 ? "pos" : "neg"}
          />
          <KpiCard icon={TrendingUp} label="Total gasto" value={fmtMoney(t.spent)} />
          <KpiCard icon={TrendingUp} label="Total recebido" value={fmtMoney(t.received)} />
          <KpiCard
            icon={TrendingUp}
            label="Maior contratação"
            value={fmtMoney(Number(t.biggestBuy?.value ?? 0))}
            hint={t.biggestBuy?.person_name ?? "—"}
          />
          <KpiCard
            icon={TrendingUp}
            label="Maior venda"
            value={fmtMoney(Number(t.biggestSale?.value ?? 0))}
            hint={t.biggestSale?.person_name ?? "—"}
          />
        </div>
        {flow.biggestWindow && (
          <p className="text-xs text-muted-foreground mt-2">
            Maior janela: <b>{flow.biggestWindow.season_year}</b> com {flow.biggestWindow.movements} movimentos.
          </p>
        )}
        {flow.byYear.length > 1 && (
          <Card className="mt-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Evolução anual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={flow.byYear}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="season_year" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: number) => fmtMoney(v)}
                    />
                    <Tooltip formatter={(v: number, name: string) => (name.includes("€") ? fmtMoney(v) : v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line yAxisId="left" type="monotone" dataKey="buys" name="Compras" stroke="hsl(var(--primary))" />
                    <Line yAxisId="left" type="monotone" dataKey="sales" name="Vendas" stroke="hsl(var(--muted-foreground))" />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="financialBalance"
                      name="Saldo € "
                      stroke="hsl(var(--destructive))"
                      strokeDasharray="4 2"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Sections 3 & 4 — Origem e Destino */}
      {od && (
        <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Origem e Destino
          </h3>
          <Tabs defaultValue="origin">
            <TabsList>
              <TabsTrigger value="origin">Origem dos reforços</TabsTrigger>
              <TabsTrigger value="destination">Destino das vendas</TabsTrigger>
            </TabsList>
            <TabsContent value="origin" className="mt-3">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Por país</CardTitle></CardHeader>
                  <CardContent><DimensionTable rows={od.origin.byCountry} valueLabel="Investido" /></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Por competição</CardTitle></CardHeader>
                  <CardContent><DimensionTable rows={od.origin.byCompetition} valueLabel="Investido" /></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Por divisão</CardTitle></CardHeader>
                  <CardContent><DimensionTable rows={od.origin.byDivision} valueLabel="Investido" /></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Por clube</CardTitle></CardHeader>
                  <CardContent><DimensionTable rows={od.origin.byClub} valueLabel="Investido" /></CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="destination" className="mt-3">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Por país</CardTitle></CardHeader>
                  <CardContent><DimensionTable rows={od.destination.byCountry} valueLabel="Recebido" /></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Por competição</CardTitle></CardHeader>
                  <CardContent><DimensionTable rows={od.destination.byCompetition} valueLabel="Recebido" /></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Por divisão</CardTitle></CardHeader>
                  <CardContent><DimensionTable rows={od.destination.byDivision} valueLabel="Recebido" /></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Por clube</CardTitle></CardHeader>
                  <CardContent><DimensionTable rows={od.destination.byClub} valueLabel="Recebido" /></CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </section>
      )}

      {/* Section 12 — Clubes mais ativos */}
      {clubs.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Clubes mais ativos
          </h3>
          <Tabs defaultValue="movements">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="movements">Mais movimentos</TabsTrigger>
              <TabsTrigger value="buys">Mais compras</TabsTrigger>
              <TabsTrigger value="sales">Mais vendas</TabsTrigger>
              <TabsTrigger value="spent">Maior investimento</TabsTrigger>
              <TabsTrigger value="balance">Melhor saldo</TabsTrigger>
            </TabsList>
            <TabsContent value="movements" className="mt-3">
              <Card><CardContent className="pt-4"><ActiveClubsTable rows={clubs} mode="movements" /></CardContent></Card>
            </TabsContent>
            <TabsContent value="buys" className="mt-3">
              <Card><CardContent className="pt-4"><ActiveClubsTable rows={clubs} mode="buys" /></CardContent></Card>
            </TabsContent>
            <TabsContent value="sales" className="mt-3">
              <Card><CardContent className="pt-4"><ActiveClubsTable rows={clubs} mode="sales" /></CardContent></Card>
            </TabsContent>
            <TabsContent value="spent" className="mt-3">
              <Card><CardContent className="pt-4"><ActiveClubsTable rows={clubs} mode="spent" /></CardContent></Card>
            </TabsContent>
            <TabsContent value="balance" className="mt-3">
              <Card><CardContent className="pt-4"><ActiveClubsTable rows={clubs} mode="balance" /></CardContent></Card>
            </TabsContent>
          </Tabs>
        </section>
      )}

      {/* Section 5 — Nacionalidades */}
      {nat && (nat.byNationality.length > 0 || nat.byContinent.length > 0) && (
        <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Globe2 className="h-4 w-4" /> Nacionalidades
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            Cobertura: {nat.coverage}/{nat.total} movimentos com dados.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Por país</CardTitle></CardHeader>
              <CardContent><BucketTable rows={nat.byNationality} /></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Por continente</CardTitle></CardHeader>
              <CardContent><BucketTable rows={nat.byContinent} /></CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Section 6 — Perfil etário */}
      {age && (age.buyStats.count > 0 || age.saleStats.count > 0) && (
        <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Cake className="h-4 w-4" /> Perfil etário
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={Cake} label="Idade média (compras)" value={fmtNum(age.buyStats.avg, 1)} hint={`Min ${age.buyStats.min || "—"} · Max ${age.buyStats.max || "—"}`} />
            <KpiCard icon={Cake} label="Idade média (vendas)" value={fmtNum(age.saleStats.avg, 1)} hint={`Min ${age.saleStats.min || "—"} · Max ${age.saleStats.max || "—"}`} />
            <KpiCard icon={Users} label="Compras <21" value={fmtInt(age.buyStats.under21)} hint={`${fmtNum((age.buyStats.under21 / Math.max(1, age.buyStats.count)) * 100, 0)}% dos reforços`} />
            <KpiCard icon={Users} label="Vendas >30" value={fmtInt(age.saleStats.over30)} hint={`${fmtNum((age.saleStats.over30 / Math.max(1, age.saleStats.count)) * 100, 0)}% das saídas`} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 mt-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição etária (compras)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { g: "<21", n: age.buyStats.under21 },
                      { g: "21-25", n: age.buyStats.age21to25 },
                      { g: "26-30", n: age.buyStats.age26to30 },
                      { g: ">30", n: age.buyStats.over30 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="g" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="n" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição etária (vendas)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { g: "<21", n: age.saleStats.under21 },
                      { g: "21-25", n: age.saleStats.age21to25 },
                      { g: "26-30", n: age.saleStats.age26to30 },
                      { g: ">30", n: age.saleStats.over30 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="g" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="n" fill="hsl(var(--muted-foreground))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          {age.yearly.length > 1 && (
            <Card className="mt-3">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução da idade média</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={age.yearly}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="season_year" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} domain={[15, 40]} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="avgBuyAge" name="Compras" stroke="hsl(var(--primary))" />
                      <Line type="monotone" dataKey="avgSaleAge" name="Vendas" stroke="hsl(var(--muted-foreground))" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* Section 7 — Perfil técnico */}
      {tech && (
        <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Perfil técnico
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={BarChart3} label="CA médio (compras)" value={fmtNum(tech.buys.avgCA, 0)} />
            <KpiCard icon={BarChart3} label="CA médio (vendas)" value={fmtNum(tech.sales.avgCA, 0)} />
            <KpiCard icon={TrendingUp} label="VP médio (compras)" value={fmtMoney(tech.buys.avgVP)} />
            <KpiCard icon={TrendingUp} label="VP médio (vendas)" value={fmtMoney(tech.sales.avgVP)} />
            <KpiCard icon={TrendingUp} label="Salário médio (compras)" value={fmtMoney(tech.buys.avgSalary)} />
            <KpiCard icon={TrendingUp} label="Salário médio (vendas)" value={fmtMoney(tech.sales.avgSalary)} />
            <KpiCard icon={Sparkles} label="Reputação média (compras)" value={fmtNum(tech.buys.avgReputation, 1)} />
            <KpiCard icon={Sparkles} label="Reputação média (vendas)" value={fmtNum(tech.sales.avgReputation, 1)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 mt-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição por CA</CardTitle></CardHeader>
              <CardContent><BucketTable rows={tech.byCA} /></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição por reputação</CardTitle></CardHeader>
              <CardContent><BucketTable rows={tech.byReputation} /></CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Section 8 — Perfil posicional */}
      {pos && pos.byGroup.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" /> Perfil posicional
          </h3>
          <Card>
            <CardContent className="pt-4"><BucketTable rows={pos.byGroup} /></CardContent>
          </Card>
        </section>
      )}

      {/* Section 10 — Perfil pessoal */}
      {perso && (perso.byPersonality.length > 0 || perso.byFoot.length > 0 || perso.byHeight.length > 0) && (
        <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Perfil pessoal
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Personalidade</CardTitle></CardHeader>
              <CardContent><BucketTable rows={perso.byPersonality} showAvg={false} /></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Pé preferido</CardTitle></CardHeader>
              <CardContent><BucketTable rows={perso.byFoot} showAvg={false} /></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Altura</CardTitle></CardHeader>
              <CardContent><BucketTable rows={perso.byHeight} showAvg={false} /></CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Section 11 — Mercado interno vs externo */}
      {inout && (
        <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Repeat className="h-4 w-4" /> Mercado interno vs externo
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Compras</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs"><span>Interno (mesma competição)</span><span className="tabular-nums">{inout.buys.internal} · {fmtNum(inout.buys.internalPct, 0)}%</span></div>
                <Progress value={inout.buys.internalPct} className="h-2" />
                <div className="flex justify-between text-xs"><span>Externo</span><span className="tabular-nums">{inout.buys.external} · {fmtNum(100 - inout.buys.internalPct, 0)}%</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Vendas</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs"><span>Interno (mesma competição)</span><span className="tabular-nums">{inout.sales.internal} · {fmtNum(inout.sales.internalPct, 0)}%</span></div>
                <Progress value={inout.sales.internalPct} className="h-2" />
                <div className="flex justify-between text-xs"><span>Externo</span><span className="tabular-nums">{inout.sales.external} · {fmtNum(100 - inout.sales.internalPct, 0)}%</span></div>
              </CardContent>
            </Card>
          </div>
          {inout.internalPartners.length > 0 && (
            <Card className="mt-3">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Principais parceiros internos</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {inout.internalPartners.map((p) => (
                    <div key={p.club} className="flex justify-between text-xs py-1 border-b last:border-b-0">
                      <span className="truncate">{p.club}</span>
                      <span className="tabular-nums">{p.total} negócios</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
