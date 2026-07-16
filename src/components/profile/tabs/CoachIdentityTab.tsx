import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ProfileContext } from "@/lib/profile/types";
import { useCoachRoster, useCoachUniverse } from "@/lib/coach-identity/data";
import {
  computeSquadProfile,
  computeStyleIndicators,
  type StyleIndicator,
} from "@/lib/coach-identity/compute";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";

const fmtNum = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : "—");
const fmtInt = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("pt-PT") : "—");
const fmtMoney = (n: number) => {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`;
  return `€${n.toFixed(0)}`;
};

function StylePill({ ind }: { ind: StyleIndicator }) {
  const color =
    ind.classification === "Muito Alto"
      ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
      : ind.classification === "Alto"
        ? "bg-blue-500/15 text-blue-500 border-blue-500/30"
        : ind.classification === "Médio"
          ? "bg-muted text-muted-foreground border-border"
          : ind.classification === "Baixo"
            ? "bg-orange-500/15 text-orange-500 border-orange-500/30"
            : "bg-rose-500/15 text-rose-500 border-rose-500/30";
  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-sm font-medium">{ind.label}</span>
        <Badge variant="outline" className={`text-[10px] ${color}`}>
          {ind.classification}
        </Badge>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-lg font-bold tabular-nums">{fmtNum(ind.value, 0)}</span>
        <span className="text-[11px] text-muted-foreground">
          percentil {fmtNum(ind.percentile, 0)}
        </span>
      </div>
      <Progress value={ind.value} className="h-1.5" />
      {ind.evolution.length > 1 && (
        <div className="mt-2 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ind.evolution}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
                dot={false}
              />
              <YAxis hide domain={[0, 100]} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function CoachIdentityTab({ ctx }: { ctx: ProfileContext }) {
  const { data: roster, isLoading } = useCoachRoster(ctx.name);
  const { data: universe } = useCoachUniverse();

  const squad = useMemo(
    () => (roster ? computeSquadProfile(roster.players, roster.assignments) : null),
    [roster],
  );
  const style = useMemo(
    () => (roster ? computeStyleIndicators(roster.players, universe) : []),
    [roster, universe],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!roster || !squad || roster.players.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Sem dados de plantel disponíveis para calcular a identidade deste treinador.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Style indicators */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-lg font-semibold">Estilo de jogo</h3>
          <p className="text-xs text-muted-foreground">
            {roster.players.length} registos de jogadores · {squad.seasons} épocas
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {style.map((s) => (
            <StylePill key={s.id} ind={s} />
          ))}
        </div>
      </div>

      {/* Squad profile */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Perfil do plantel utilizado</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Idade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums mb-2">
                {fmtNum(squad.avgAge)} <span className="text-sm font-normal text-muted-foreground">anos</span>
              </div>
              <div className="space-y-1.5">
                {squad.ageDistribution.map((b) => (
                  <div key={b.key} className="flex items-center gap-2 text-xs">
                    <span className="w-14 text-muted-foreground">{b.label}</span>
                    <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${b.pct}%` }}
                      />
                    </div>
                    <span className="w-16 text-right tabular-nums">
                      {b.count} ({fmtNum(b.pct, 0)}%)
                    </span>
                  </div>
                ))}
              </div>
              {squad.ageEvolution.length > 1 && (
                <div className="mt-4 h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={squad.ageEvolution}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} domain={["dataMin - 1", "dataMax + 1"]} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="avgAge"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Nacionalidades preferidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {squad.nationalities.slice(0, 10).map((n) => (
                  <div key={n.key} className="flex items-center gap-2 text-xs">
                    <span className="w-28 truncate">{n.label}</span>
                    <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${n.pct}%` }} />
                    </div>
                    <span className="w-16 text-right tabular-nums">
                      {n.count} ({fmtNum(n.pct, 0)}%)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Continentes preferidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={squad.continents}>
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="pct" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Posições utilizadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">
                    Por grupo
                  </div>
                  {squad.positionsGroup.map((b) => (
                    <div key={b.key} className="flex items-center gap-2 text-xs mb-1">
                      <span className="w-24 truncate">{b.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {b.count} ({fmtNum(b.pct, 0)}%)
                      </span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">
                    Detalhadas
                  </div>
                  {squad.positionsDetail.map((b) => (
                    <div key={b.key} className="flex items-center gap-2 text-xs mb-1">
                      <span className="w-28 truncate">{b.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {b.count} ({fmtNum(b.pct, 0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pé dominante</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-2xl font-bold tabular-nums">
                    {fmtNum(squad.feet.right, 0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Destros</div>
                </div>
                <div>
                  <div className="text-2xl font-bold tabular-nums">
                    {fmtNum(squad.feet.left, 0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Canhotos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold tabular-nums">
                    {fmtNum(squad.feet.ambi, 0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Ambidestros</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Perfil físico e reputação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-muted-foreground">Altura média</span>
                <span className="text-right tabular-nums">{fmtNum(squad.avgHeight)} cm</span>
                <span className="text-muted-foreground">Peso médio</span>
                <span className="text-right tabular-nums">{fmtNum(squad.avgWeight)} kg</span>
                <span className="text-muted-foreground">Valor médio</span>
                <span className="text-right tabular-nums">{fmtMoney(squad.avgValue)}</span>
                <span className="text-muted-foreground">CA médio</span>
                <span className="text-right tabular-nums">{fmtInt(squad.avgCa)}</span>
                <span className="text-muted-foreground">PA médio</span>
                <span className="text-right tabular-nums">{fmtInt(squad.avgPa)}</span>
                <span className="text-muted-foreground">Reputação média</span>
                <span className="text-right tabular-nums">{fmtInt(squad.avgReputation)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
