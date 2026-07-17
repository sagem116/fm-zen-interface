// Market Rankings — deterministic narrative generator.

import type { MarketEntityKind, MarketRankingResult } from "./types";
import { formatCurrency } from "@/components/market/format";

const KIND_LABEL: Record<MarketEntityKind, string> = {
  competition: "competição",
  club: "clube",
  coach: "treinador",
};

export function buildMarketNarrative(
  result: MarketRankingResult,
  kind: MarketEntityKind,
): string[] {
  const label = KIND_LABEL[kind];
  const lines: string[] = [];
  if (!result.rows.length) {
    return [`Sem dados suficientes para construir uma narrativa sobre ${label}s.`];
  }
  const [top] = result.rows;
  const globalAge = result.totals.globalAvgAge;

  lines.push(
    `${top.name} lidera este ranking com ${formatCurrency(top.totalValue)} em movimentação de mercado, agregando ${top.transferCount} transferências.`,
  );

  if (top.avgValue > 0) {
    lines.push(
      `Investimento médio por contratação de ${formatCurrency(top.avgValue)}, com o maior negócio a fixar-se em ${formatCurrency(top.maxValue)}.`,
    );
  }

  if (top.avgAge != null && globalAge != null) {
    const diff = top.avgAge - globalAge;
    if (Math.abs(diff) < 0.5) {
      lines.push(
        `A idade média das contratações (${top.avgAge.toFixed(1)}) está alinhada com a média global (${globalAge.toFixed(1)}).`,
      );
    } else if (diff < 0) {
      lines.push(
        `Aposta em jogadores jovens: idade média de contratação ${top.avgAge.toFixed(1)}, abaixo da média global ${globalAge.toFixed(1)}.`,
      );
    } else {
      lines.push(
        `Preferência por jogadores experientes: idade média ${top.avgAge.toFixed(1)}, acima da média global ${globalAge.toFixed(1)}.`,
      );
    }
  }

  if (top.balance !== 0) {
    const sign = top.balance > 0 ? "negativo" : "positivo";
    lines.push(
      `Saldo compras/vendas ${sign} de ${formatCurrency(Math.abs(top.balance))} (compras ${formatCurrency(top.buysValue)}, vendas ${formatCurrency(top.salesValue)}).`,
    );
  }

  if (result.rows.length > 1) {
    const runner = result.rows[1];
    lines.push(
      `Em segundo lugar surge ${runner.name} com ${formatCurrency(runner.totalValue)}, uma diferença de ${formatCurrency(Math.max(0, top.totalValue - runner.totalValue))}.`,
    );
  }

  return lines;
}
