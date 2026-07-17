import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Info } from "lucide-react";
import { buildMarketNarrative } from "@/lib/market-rankings/narrative";
import type { MarketEntityKind, MarketRankingResult } from "@/lib/market-rankings/types";

interface Props {
  result: MarketRankingResult | null;
  kind: MarketEntityKind;
  mode: "narrative" | "explain";
}

export function MarketNarrative({ result, kind, mode }: Props) {
  if (!result) return null;
  const lines = buildMarketNarrative(result, kind);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {mode === "narrative" ? (
            <Sparkles className="h-4 w-4 text-primary" />
          ) : (
            <Info className="h-4 w-4 text-primary" />
          )}
          {mode === "narrative" ? "Análise" : "Como foi calculado"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {mode === "narrative" ? (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        ) : (
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              Cada transferência é lida uma única vez a partir do módulo de transferências. Valores
              são normalizados (M = milhões, K = milhares); quando existe um valor entre parênteses
              — como "84M € (114M €)" — apenas o valor entre parênteses é considerado.
            </p>
            <p>
              Transferências sem valor entram no cálculo da idade média mas são excluídas dos totais
              financeiros e da média por contratação.
            </p>
            <p>
              O saldo é calculado como <b>compras − vendas</b>. Para competições, uma transferência
              conta como compra para os clubes participantes que receberam o jogador e como venda
              para os clubes participantes que o cederam. O ranking de treinadores atribui a
              transferência ao treinador do clube nessa época (via coach_assignments).
            </p>
            <p>
              Ranking total: <b>{result.totals.entities}</b> entidades. Idade média global:{" "}
              <b>{result.totals.globalAvgAge != null ? result.totals.globalAvgAge.toFixed(1) : "—"}</b>.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
