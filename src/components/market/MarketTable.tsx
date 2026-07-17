import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "./format";
import type { MarketEntityKind, MarketRankingRow } from "@/lib/market-rankings/types";

interface Props {
  rows: MarketRankingRow[];
  kind: MarketEntityKind;
  title?: string;
  emptyMessage?: string;
}

function entityLink(kind: MarketEntityKind, name: string): { to: any; params: any } | null {
  const enc = encodeURIComponent(name);
  if (kind === "club") return { to: "/clubes/$name", params: { name: enc } };
  if (kind === "coach") return { to: "/treinadores/$name", params: { name: enc } };
  if (kind === "competition") return { to: "/competicoes/$name", params: { name: enc } };
  return null;
}

export function MarketTable({ rows, kind, title, emptyMessage }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">{title ?? `Ranking (${rows.length})`}</CardTitle>
        <Badge variant="outline" className="text-[10px]">{rows.length} entradas</Badge>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {emptyMessage ?? "Sem dados suficientes para este ranking."}
          </p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left w-12">Pos.</th>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Média</th>
                  <th className="px-3 py-2 text-right">Maior</th>
                  <th className="px-3 py-2 text-right">Idade méd.</th>
                  <th className="px-3 py-2 text-right">Saldo</th>
                  <th className="px-3 py-2 text-right">Trf.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const link = entityLink(kind, row.name);
                  return (
                    <tr key={row.key} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">
                        {link ? (
                          <Link
                            to={link.to}
                            params={link.params}
                            className="hover:underline"
                          >
                            {row.name}
                          </Link>
                        ) : (
                          row.name
                        )}
                        {row.meta?.country && (
                          <span className="ml-2 text-[10px] text-muted-foreground">
                            {row.meta.country}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">
                        {formatCurrency(row.totalValue)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(row.avgValue)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(row.maxValue)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs">
                        {row.avgAge != null ? row.avgAge.toFixed(1) : "—"}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right tabular-nums text-xs",
                          row.balance > 0 && "text-rose-500",
                          row.balance < 0 && "text-emerald-500",
                        )}
                      >
                        {row.balance === 0 ? "—" : formatCurrency(row.balance)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs text-muted-foreground">
                        {row.transferCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
