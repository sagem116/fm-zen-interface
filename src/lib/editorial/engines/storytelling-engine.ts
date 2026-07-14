import type { EditorialContext } from "../types";

export function buildStorytellingNarrative(ctx: EditorialContext): string[] {
  const out: string[] = [];
  const percentile = ctx.score.percentile;
  const seasons = ctx.evolution.seasonsTracked;
  const deltaScore = ctx.evolution.deltaScore ?? 0;

  if (ctx.legacy?.dominance != null && ctx.legacy.dominance >= 0.5) {
    out.push("Dinastia: a entidade transforma excelência em hábito e não em exceção.");
  } else if (percentile >= 97 && seasons <= 3) {
    out.push(
      "Explosão: o salto recente foi rápido o bastante para alterar a perceção da entidade.",
    );
  } else if (deltaScore > 0.5 && seasons >= 5) {
    out.push(
      "Consistência: a ascensão está a ser sustentada por repetição de bons sinais, não por um único evento.",
    );
  } else if (deltaScore < -0.5 && seasons >= 5) {
    out.push("Declínio: a posição continua relevante, mas a curva recente já não tem a mesma força.");
  } else if (ctx.institution?.cyclePhase === "rebuild") {
    out.push("Reconstrução: o presente é de ajustamento, com foco em reequilibrar a identidade competitiva.");
  }

  if (ctx.career?.phase === "veteran" || ctx.legacy?.longevitySeasons) {
    out.push("Veterano: a longevidade passou a ser parte central da leitura editorial.");
  }
  if (ctx.ecosystem?.generationLabel) {
    out.push(
      `Mudança geracional: ${ctx.ecosystem.generationLabel} já funciona como narrativa dominante do ecossistema.`,
    );
  }

  if (!out.length) {
    out.push("Transição: o retrato atual sugere um ciclo em formação, ainda sem etiqueta definitiva.");
  }

  return out.slice(0, 4);
}
