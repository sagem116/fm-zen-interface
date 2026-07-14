import type { EditorialContext } from "../types";

export function buildContextNarrative(ctx: EditorialContext): string[] {
  const out: string[] = [];

  if (ctx.career) {
    const phase = ctx.career.phase ?? inferCareerPhase(ctx);
    const clubs = ctx.career.clubs?.length ?? 0;
    const titles = ctx.career.titles ?? 0;
    if (phase === "legacy") {
      out.push(
        `A carreira já entrou numa fase de legado, sustentada por ${ctx.career.seasons} épocas e uma presença prolongada entre referências do setor.`,
      );
    } else if (phase === "veteran") {
      out.push(
        `A longevidade começa a pesar tanto quanto o rendimento: ${ctx.career.seasons} épocas, ${clubs} clubes e um nível competitivo ainda muito elevado.`,
      );
    } else if (phase === "ascending") {
      out.push(
        "O percurso ainda está em aceleração, mas já há sinais claros de consolidação acima da média da carreira recente.",
      );
    } else if (phase === "emerging") {
      out.push(
        "O ciclo inicial aponta para crescimento, com margem evidente para ganhar mais densidade competitiva.",
      );
    } else {
      out.push(
        "O percurso desenha uma trajetória estável, com crescimento suficiente para sustentar relevância contínua.",
      );
    }
    if (titles > 0) {
      out.push(
        "Os títulos acumulados ajudam a explicar o estatuto atual, porque transformam rendimento episódico em continuidade de projeto.",
      );
    }
  }

  if (ctx.institution) {
    const phase = ctx.institution.cyclePhase ?? inferInstitutionPhase(ctx);
    if (phase === "peak") {
      out.push(
        "A instituição vive um ciclo de domínio, com eras claramente marcadas e um nível de competitividade difícil de igualar.",
      );
    } else if (phase === "rise") {
      out.push(
        "O contexto institucional está em ascensão, com sinais de projeto sustentado e evolução consistente da identidade competitiva.",
      );
    } else if (phase === "decline") {
      out.push(
        "A leitura histórica é mais prudente: o ciclo recente mostra perda de tração face aos períodos mais fortes.",
      );
    } else if (phase === "rebuild") {
      out.push(
        "O enquadramento é de reconstrução, o que ajuda a explicar alguma volatilidade e uma busca por nova estabilidade.",
      );
    } else {
      out.push("A trajetória institucional mantém-se coerente, sem ruturas fortes no padrão competitivo.");
    }
    if (ctx.institution.titles != null && ctx.institution.titles > 0) {
      out.push(
        "Os títulos conquistados reforçam o peso histórico do projeto e o seu grau de maturidade.",
      );
    }
  }

  if (ctx.competitionProfile) {
    const trend = ctx.competitionProfile.strengthTrend ?? "stable";
    if (trend === "rising") {
      out.push(
        "A competição está a ganhar densidade, o que torna a interpretação dos resultados mais exigente.",
      );
    } else if (trend === "declining") {
      out.push(
        "A competição perdeu alguma intensidade média, logo a leitura do ranking exige mais contexto comparativo.",
      );
    } else {
      out.push(
        "A competição mantém um nível estável, permitindo comparações mais fiáveis entre épocas.",
      );
    }
    if (ctx.competitionProfile.topClubs?.length) {
      out.push(
        "Os clubes de referência continuam a concentrar boa parte da dinâmica competitiva, o que explica o peso dos líderes no retrato global.",
      );
    }
  }

  if (ctx.ecosystem) {
    const trend = ctx.ecosystem.qualityTrend ?? "stable";
    if (trend === "rising") {
      out.push(
        "O ecossistema nacional/continental está a produzir uma geração mais forte do que a anterior.",
      );
    } else if (trend === "declining") {
      out.push(
        "Há sinais de transição no ecossistema, com a base de talento a perder alguma consistência.",
      );
    } else {
      out.push(
        "O ecossistema mantém a sua identidade histórica, com estabilidade suficiente para evitar ruturas bruscas.",
      );
    }
    if (ctx.ecosystem.generationLabel) {
      out.push(`A geração atual encaixa bem no rótulo editorial de ${ctx.ecosystem.generationLabel}.`);
    }
  }

  if (ctx.legacy) {
    if (ctx.legacy.dominance != null && ctx.legacy.dominance >= 0.5) {
      out.push(
        "O legado é dominado por um ciclo de excelência prolongada, mais do que por picos isolados.",
      );
    } else if (ctx.legacy.longevitySeasons != null) {
      out.push(
        `A longevidade continua a ser o principal ativo histórico, com ${ctx.legacy.longevitySeasons} épocas de presença relevante.`,
      );
    }
    if (ctx.legacy.era)
      out.push(`A época identificada como ${ctx.legacy.era} funciona como referência histórica para a leitura atual.`);
  }

  return [...new Set(out)].slice(0, 6);
}

function inferCareerPhase(
  ctx: EditorialContext,
): NonNullable<NonNullable<EditorialContext["career"]>["phase"]> {
  const seasons = ctx.career?.seasons ?? ctx.evolution.seasonsTracked;
  if (seasons <= 2) return "emerging";
  if (seasons <= 5) return "ascending";
  if (seasons >= 10 && ctx.score.percentile >= 90) return "legacy";
  if (ctx.identity.age != null && ctx.identity.age >= 33) return "veteran";
  return "peak";
}

function inferInstitutionPhase(
  ctx: EditorialContext,
): NonNullable<NonNullable<EditorialContext["institution"]>["cyclePhase"]> {
  if (ctx.evolution.deltaScore != null && ctx.evolution.deltaScore > 0.5) return "rise";
  if (ctx.evolution.deltaScore != null && ctx.evolution.deltaScore < -0.5) return "decline";
  return "stable";
}
