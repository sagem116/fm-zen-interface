import type { EditorialContext } from "../types";
import { formatSigned } from "./shared";

export function buildExplainNarrative(ctx: EditorialContext): string[] {
  const out: string[] = [];

  if (ctx.topContributions.length) {
    const [first, second, third] = ctx.topContributions;
    out.push(
      `O score existe porque vários fatores se acumulam, mas os principais drivers são ${first?.label ?? ""}${second ? ` e ${second.label}` : ""}${third ? `, com ${third.label} a completar o núcleo explicativo` : ""}.`,
    );
    out.push(
      "Isto significa que a posição não depende de um único pico, mas da combinação dos elementos que mais pesam no cálculo oficial.",
    );
  } else {
    out.push(
      "O score reflete a leitura oficial do modelo, mesmo quando o breakdown não está disponível em detalhe.",
    );
  }

  if (ctx.confidence.level > 0) {
    const level = ctx.confidence.level >= 80 ? "alta" : ctx.confidence.level >= 50 ? "média" : "baixa";
    const coverage =
      ctx.confidence.coverage != null ? ` com cobertura de ${(ctx.confidence.coverage * 100).toFixed(0)}%` : "";
    out.push(
      `A confiança da avaliação é ${level}${coverage}, por isso a leitura deve ser mais ou menos firme conforme a densidade da amostra.`,
    );
  }

  if (ctx.rankings.world) {
    out.push(
      `A posição no ranking é coerente com o universo avaliado: ${ctx.rankings.world.rank}.º lugar em ${ctx.rankings.world.total}, o que explica porque o mesmo score pode soar dominante ou apenas competitivo consoante o contexto.`,
    );
  }

  if (ctx.evolution.previousScore != null) {
    out.push(
      `A variação relativamente à época anterior é ${formatSigned(ctx.evolution.deltaScore ?? 0)}; quando o número sobe e a posição melhora, trata-se de evolução real, não apenas de oscilação visual.`,
    );
  }

  if (ctx.similar.length) {
    out.push(
      "O sistema de semelhantes ajuda a perceber o lugar exato da entidade no mapa competitivo, porque aproxima este caso de perfis que já mostraram comportamento semelhante.",
    );
  }

  return out.slice(0, 5);
}
