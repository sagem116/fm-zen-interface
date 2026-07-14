import { buildEditorialContext } from "../context";
import type { EditorialContext, EditorialInput, SeasonStoryContext, CareerContext } from "../types";

export interface CareerCenterNarrativeInput extends Omit<EditorialInput, "seasonStory" | "career"> {
  seasonStory?: SeasonStoryContext;
  career?: CareerContext;
}

/** Build an EditorialContext tuned for the Career Center season magazine. */
export function buildCareerCenterNarrativeContext(
  input: CareerCenterNarrativeInput,
): EditorialContext {
  const ctx = buildEditorialContext(input as EditorialInput);
  if (input.seasonStory) ctx.seasonStory = input.seasonStory;
  if (input.career) ctx.career = input.career;
  return ctx;
}
