import type { EditorialContext, EditorialInput, InsightCard } from "./types";

function pushInsight(list: InsightCard[], insight: InsightCard) {
  list.push(insight);
}

export function buildInsights(
  input: EditorialInput,
  ctx: Pick<EditorialContext, "score" | "evolution" | "identity">,
): InsightCard[] {
  const out: InsightCard[] = [];
  const rank = input.rank;
  const total = input.totalRanked;
  const pct = ctx.score.percentile;

  if (pct >= 99.9)
    pushInsight(out, {
      id: "top01",
      kind: "top01",
      tone: "positive",
      title: "Top 0.1%",
      description: "Pertence ao top 0.1% das entidades avaliadas neste score.",
    });
  else if (pct >= 99)
    pushInsight(out, {
      id: "top1",
      kind: "top1",
      tone: "positive",
      title: "Top 1%",
      description: "Pertence ao top 1% das entidades avaliadas neste score.",
    });

  if (rank <= 10 && total >= 10) {
    const prevRank = ctx.evolution.previousRank;
    if (prevRank == null || prevRank > 10) {
      pushInsight(out, {
        id: "top10-entry",
        kind: "top10-entry",
        tone: "positive",
        title: "Entrada no Top 10",
        description: "Entrou pela primeira vez recente no Top 10 do ranking.",
      });
    }
  }

  const dr = ctx.evolution.deltaRank;
  if (dr != null && dr <= -5) {
    pushInsight(out, {
      id: "biggest-rise",
      kind: "biggest-rise",
      tone: "positive",
      title: "Maior subida",
      description: `Subiu ${Math.abs(dr)} posições face à época anterior.`,
    });
  } else if (dr != null && dr >= 5) {
    pushInsight(out, {
      id: "biggest-fall",
      kind: "biggest-fall",
      tone: "warning",
      title: "Maior queda",
      description: `Perdeu ${dr} posições face à época anterior.`,
    });
  }

  if (ctx.identity.kind === "player" && ctx.identity.age != null) {
    if (ctx.identity.age <= 21 && pct >= 90)
      pushInsight(out, {
        id: "best-young",
        kind: "best-young",
        tone: "positive",
        title: "Melhor jovem",
        description: "Está entre os melhores jovens deste score.",
      });
    if (ctx.identity.age >= 33 && pct >= 90)
      pushInsight(out, {
        id: "best-veteran",
        kind: "best-veteran",
        tone: "positive",
        title: "Melhor veterano",
        description: "Continua entre a elite apesar da idade avançada.",
      });
  }

  if (ctx.evolution.seasonsTracked >= 5 && pct >= 85) {
    pushInsight(out, {
      id: "consistency",
      kind: "consistency",
      tone: "positive",
      title: "Consistência",
      description: "Mantém-se entre a elite ao longo de várias épocas.",
    });
  }
  if (ctx.evolution.seasonsTracked >= 8) {
    pushInsight(out, {
      id: "longevity",
      kind: "longevity",
      tone: "neutral",
      title: "Longevidade",
      description: `${ctx.evolution.seasonsTracked} épocas com registo neste score.`,
    });
  }

  const f = input.flags ?? {};
  if (f.bestOfClub)
    pushInsight(out, {
      id: "best-of-club",
      kind: "best-of-club",
      tone: "positive",
      title: "Melhor do Clube",
      description: "Melhor pontuação do clube neste score.",
    });
  if (f.bestOfCompetition)
    pushInsight(out, {
      id: "best-of-competition",
      kind: "best-of-competition",
      tone: "positive",
      title: "Melhor da Competição",
      description: "Melhor pontuação da competição neste score.",
    });
  if (f.bestOfCountry)
    pushInsight(out, {
      id: "best-of-country",
      kind: "best-of-country",
      tone: "positive",
      title: "Melhor do País",
      description: "Melhor pontuação do país neste score.",
    });
  if (f.bestOfContinent)
    pushInsight(out, {
      id: "best-of-continent",
      kind: "best-of-continent",
      tone: "positive",
      title: "Melhor do Continente",
      description: "Melhor pontuação do continente neste score.",
    });
  if (f.bestOfWorld)
    pushInsight(out, {
      id: "best-of-world",
      kind: "best-of-world",
      tone: "positive",
      title: "Melhor do Mundo",
      description: "Ocupa o primeiro lugar mundial neste score.",
    });

  return out;
}
