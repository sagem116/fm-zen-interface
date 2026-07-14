import type { ComparisonFact, EditorialContext, EditorialInput } from "./types";

/**
 * Deterministic editorial comparison facts.
 * Consumes only existing data (percentile, ranks, evolution, flags,
 * optional domain contexts). Reusable by Rankings, Profiles, Hall of
 * Fame, Career Center and Dashboards.
 */
export function buildComparison(
  input: EditorialInput,
  ctx: Pick<EditorialContext, "score" | "evolution" | "identity">,
): ComparisonFact[] {
  const out: ComparisonFact[] = [];
  const pct = ctx.score.percentile;
  if (pct >= 50) {
    out.push({
      id: "percentile",
      kind: "percentile",
      text: `Melhor que ${pct.toFixed(1)}% das entidades avaliadas.`,
    });
  }

  if (input.rank <= 10 && input.totalRanked >= 10) {
    out.push({
      id: "top10",
      kind: "top10-entry",
      text: `Entre os 10 melhores de ${input.totalRanked} entidades avaliadas.`,
    });
  }

  const f = input.flags ?? {};
  if (f.bestOfWorld)
    out.push({ id: "best-world", kind: "best-of-world", text: "Melhor do mundo neste score." });
  else if (f.bestOfContinent)
    out.push({
      id: "best-continent",
      kind: "best-of-continent",
      text: `Melhor do continente${ctx.identity.continent ? ` (${ctx.identity.continent})` : ""}.`,
    });
  else if (f.bestOfCountry)
    out.push({
      id: "best-country",
      kind: "best-of-country",
      text: `Melhor do país${ctx.identity.country ? ` (${ctx.identity.country})` : ""}.`,
    });
  else if (f.bestOfCompetition)
    out.push({
      id: "best-comp",
      kind: "best-of-competition",
      text: `Melhor da competição${ctx.identity.competition ? ` (${ctx.identity.competition})` : ""}.`,
    });
  else if (f.bestOfClub)
    out.push({
      id: "best-club",
      kind: "best-of-club",
      text: `Melhor do clube${ctx.identity.club ? ` (${ctx.identity.club})` : ""}.`,
    });

  const dr = ctx.evolution.deltaRank;
  if (dr != null && dr <= -3)
    out.push({
      id: "rise",
      kind: "biggest-rise",
      text: `Subida de ${Math.abs(dr)} posições face à época anterior.`,
    });
  else if (dr != null && dr >= 3)
    out.push({
      id: "fall",
      kind: "biggest-fall",
      text: `Queda de ${dr} posições face à época anterior.`,
    });

  if (ctx.identity.kind === "player" && ctx.identity.age != null) {
    if (ctx.identity.age <= 21 && pct >= 90)
      out.push({ id: "young", kind: "best-young", text: "Entre os melhores jovens da avaliação." });
    if (ctx.identity.age >= 33 && pct >= 90)
      out.push({
        id: "veteran",
        kind: "best-veteran",
        text: "Entre os melhores veteranos da avaliação.",
      });
  }

  // Career-derived contextual comparisons (Perfis, Career Center, Hall of Fame)
  if (input.career) {
    const c = input.career;
    if (c.peakSeason != null && input.season != null && c.peakSeason === input.season) {
      out.push({
        id: "career-peak",
        kind: "career-peak",
        text: "É a melhor época da carreira até ao momento.",
      });
    }
    if (c.peakScore != null && ctx.score.value >= c.peakScore) {
      out.push({
        id: "best-season",
        kind: "best-season-of-career",
        text: "Iguala ou supera o melhor registo de sempre da carreira.",
      });
    }
  }

  const deltaScore = ctx.evolution.deltaScore;
  if (deltaScore != null && deltaScore >= 3) {
    out.push({
      id: "biggest-evolution",
      kind: "biggest-evolution",
      text: `Evolução de +${deltaScore.toFixed(1)} pontos face à época anterior.`,
    });
  }

  return out;
}

/**
 * Contextual comparison helper — reusable across modules to explain
 * relations between existing data (no new scores, no engine calls).
 *
 * Consumers pass a compact set of relations and receive editorial-ready
 * PT-PT facts. Complements `buildComparison` for cases where the caller
 * does not have a full `EditorialInput` (e.g. dashboard cards).
 */
export interface ContextualRelations {
  bestOfClub?: string;
  bestOfCompetition?: string;
  bestOfCountry?: string;
  bestOfContinent?: string;
  bestOfWorld?: boolean;
  biggestRise?: { entity: string; positions: number };
  biggestEvolution?: { entity: string; delta: number };
  bestYoung?: string;
  bestVeteran?: string;
  bestSeasonOfCareer?: { entity: string; season: number };
}

export function buildContextualComparison(rel: ContextualRelations): ComparisonFact[] {
  const out: ComparisonFact[] = [];
  if (rel.bestOfWorld)
    out.push({ id: "cx-world", kind: "best-of-world", text: "Melhor do mundo na sua categoria." });
  if (rel.bestOfContinent)
    out.push({
      id: "cx-cont",
      kind: "best-of-continent",
      text: `Melhor do continente (${rel.bestOfContinent}).`,
    });
  if (rel.bestOfCountry)
    out.push({
      id: "cx-country",
      kind: "best-of-country",
      text: `Melhor do país (${rel.bestOfCountry}).`,
    });
  if (rel.bestOfCompetition)
    out.push({
      id: "cx-comp",
      kind: "best-of-competition",
      text: `Melhor da competição (${rel.bestOfCompetition}).`,
    });
  if (rel.bestOfClub)
    out.push({ id: "cx-club", kind: "best-of-club", text: `Melhor do clube (${rel.bestOfClub}).` });
  if (rel.biggestRise)
    out.push({
      id: "cx-rise",
      kind: "biggest-rise",
      text: `Maior subida da época: ${rel.biggestRise.entity} (+${rel.biggestRise.positions}).`,
    });
  if (rel.biggestEvolution)
    out.push({
      id: "cx-evo",
      kind: "biggest-evolution",
      text: `Maior evolução da época: ${rel.biggestEvolution.entity} (+${rel.biggestEvolution.delta.toFixed(1)}).`,
    });
  if (rel.bestYoung)
    out.push({ id: "cx-young", kind: "best-young", text: `Melhor jovem: ${rel.bestYoung}.` });
  if (rel.bestVeteran)
    out.push({ id: "cx-vet", kind: "best-veteran", text: `Melhor veterano: ${rel.bestVeteran}.` });
  if (rel.bestSeasonOfCareer)
    out.push({
      id: "cx-career-peak",
      kind: "best-season-of-career",
      text: `Melhor época da carreira de ${rel.bestSeasonOfCareer.entity} (${rel.bestSeasonOfCareer.season}).`,
    });
  return out;
}
