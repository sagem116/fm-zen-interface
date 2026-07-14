import type { EditorialContext, EditorialLevel, NarrativeBlock, NarrativePreset } from "../types";
import { PRESETS } from "./presets";
import { makePush, type NarrativeVars } from "./preset-utils";

/**
 * composeNarrative(ctx, level, preset) — deterministic editorial narrative.
 *
 * Same editorial language and tone system across all modules — but each
 * `preset` answers a different question:
 *
 *   rankings     → "Who is best right now?" (competitive present)
 *   player       → biographical arc
 *   club         → institutional cycles
 *   competition  → strength evolution
 *   country      → talent ecosystem
 *   coach        → career and projects
 *   hallOfFame   → legacy and dominance
 *   careerCenter → season magazine / yearbook
 *
 *   mini      → 1–2 sentences (Rankings rows, Cards, Dashboards)
 *   standard  → short editorial paragraph (Profiles)
 *   editorial → full editorial (Career Center, Yearbook, Hall of Fame)
 */
export function composeNarrative(
  ctx: EditorialContext,
  level: EditorialLevel = "standard",
  preset: NarrativePreset = "rankings",
): NarrativeBlock[] {
  const vars = buildVars(ctx);
  const out: NarrativeBlock[] = [];
  const push = makePush(ctx, level, vars, ctx.seed, out);
  const fn = PRESETS[preset] ?? PRESETS.rankings;
  fn({ ctx, level, vars, seed: ctx.seed, push });
  return out;
}

function buildVars(ctx: EditorialContext): NarrativeVars {
  const dr = ctx.evolution.deltaRank;
  return {
    name: ctx.identity.name,
    role: ctx.identity.role,
    club: ctx.identity.club,
    country: ctx.identity.country,
    competition: ctx.identity.competition,
    continent: ctx.identity.continent,
    score: ctx.score.value.toFixed(1),
    grade: ctx.score.grade ?? "",
    percentile: ctx.score.percentile.toFixed(1),
    rank: ctx.rankings.world?.rank ?? "",
    total: ctx.rankings.world?.total ?? "",
    deltaRank: dr != null ? Math.abs(dr) : "",
    deltaScore: ctx.evolution.deltaScore != null ? ctx.evolution.deltaScore.toFixed(1) : "",
    prevSeason: ctx.evolution.bestSeason ?? "",
    season: ctx.seasonStory?.season ?? "",
    topDriver1: ctx.topContributions[0]?.label ?? "",
    topDriver2: ctx.topContributions[1]?.label ?? "",
    seasons: ctx.career?.seasons ?? ctx.evolution.seasonsTracked,
    titles: ctx.career?.titles ?? ctx.institution?.titles ?? "",
    clubs: (ctx.career?.clubs ?? []).length,
    peakSeason: ctx.career?.peakSeason ?? ctx.evolution.bestSeason ?? "",
    peakScore:
      ctx.career?.peakScore != null
        ? ctx.career.peakScore.toFixed(1)
        : ctx.evolution.bestScore != null
          ? ctx.evolution.bestScore.toFixed(1)
          : "",
    avgStrength:
      ctx.competitionProfile?.avgStrength != null
        ? ctx.competitionProfile.avgStrength.toFixed(1)
        : "",
    topClub1: ctx.competitionProfile?.topClubs?.[0] ?? "",
    topClub2: ctx.competitionProfile?.topClubs?.[1] ?? "",
    talentProduction: ctx.ecosystem?.talentProduction ?? "",
    generationLabel: ctx.ecosystem?.generationLabel ?? "",
    longevity: ctx.legacy?.longevitySeasons ?? ctx.evolution.seasonsTracked,
    era: ctx.legacy?.era ?? "",
    headline: ctx.seasonStory?.headline ?? "",
    trophyCount: (ctx.seasonStory?.trophies ?? []).length,
  };
}
