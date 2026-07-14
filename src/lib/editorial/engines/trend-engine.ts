import type { EditorialContext } from "../types";
import { formatSigned, movementLabel, trendLabel } from "./shared";

export function buildTrendNarrative(ctx: EditorialContext): string[] {
  const out: string[] = [];
  const deltaScore = ctx.evolution.deltaScore;
  const deltaRank = ctx.evolution.deltaRank;
  const label = trendLabel(deltaScore, deltaRank);

  if (deltaScore == null && deltaRank == null) {
    out.push("Ainda não há série suficiente para separar tendência estrutural de fotografia pontual.");
    return out;
  }

  if (label === "ascendente") {
    out.push(
      `A tendência recente é ascendente: a pontuação evolui em ${formatSigned(deltaScore ?? 0)} e a posição melhora com uma ${movementLabel(deltaRank)}.`,
    );
    out.push(
      "Isto costuma indicar uma fase de consolidação, em que o rendimento já deixou de ser episódico.",
    );
  } else if (label === "descendente") {
    out.push(
      `A trajetória recente perdeu tração: a pontuação recua ${formatSigned(deltaScore ?? 0)} e a classificação sofre uma ${movementLabel(deltaRank)}.`,
    );
    out.push(
      "A leitura editorial é de enfraquecimento relativo, mesmo que o nível absoluto continue relevante.",
    );
  } else if (label === "estável") {
    out.push(
      "A série recente mostra estabilidade, o que é valioso porque sugere continuidade competitiva em vez de dependência de um único pico.",
    );
    out.push(
      "Quando o score pouco mexe, a interpretação correta é menos sobre explosão e mais sobre sustentação.",
    );
  } else {
    out.push(
      "A tendência é de transição: há sinais mistos na pontuação e na posição, o que normalmente antecipa uma nova fase do ciclo.",
    );
    out.push("A leitura aqui é de ajuste, não de ruptura total.");
  }

  if (ctx.evolution.bestSeason != null) {
    out.push(
      `O melhor registo histórico continua a ser ${ctx.evolution.bestSeason}, referência útil para medir se a fase atual está perto de um pico ou ainda em construção.`,
    );
  }

  if (
    ctx.evolution.worstSeason != null &&
    ctx.evolution.worstScore != null &&
    ctx.evolution.seasonsTracked >= 3
  ) {
    out.push(
      `O ponto mais fraco da série está identificado em ${ctx.evolution.worstSeason}, o que ajuda a perceber a amplitude real da evolução.`,
    );
  }

  return out.slice(0, 4);
}
