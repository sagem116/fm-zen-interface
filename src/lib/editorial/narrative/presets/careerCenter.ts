import type { PresetFn } from "../preset-utils";
import {
  OPENING_SEASON_MAGAZINE,
  SEASON_HIGHLIGHT_TROPHIES,
  SEASON_HIGHLIGHT_HEADLINE,
  CLOSING_ELITE,
  CLOSING_NEUTRAL,
} from "../templates";

/**
 * Career Center preset — season magazine / yearbook.
 * Focus: season moments, storylines, achievements, career milestones.
 */
export const careerCenterPreset: PresetFn = ({ ctx, level, push }) => {
  push("opening", OPENING_SEASON_MAGAZINE.variants, "opening");
  if (level === "mini") return;

  const story = ctx.seasonStory;
  if (story?.headline) push("season-story", SEASON_HIGHLIGHT_HEADLINE.variants, "headline");
  if ((story?.trophies?.length ?? 0) > 0)
    push("season-story", SEASON_HIGHLIGHT_TROPHIES.variants, "trophies");

  if (level === "standard") return;
  push(
    "closing",
    (ctx.score.percentile >= 85 ? CLOSING_ELITE : CLOSING_NEUTRAL).variants,
    "closing",
  );
};
