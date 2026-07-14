import { buildEditorialContext } from "../context";
import type { EditorialContext, EditorialInput, LegacyContext } from "../types";

export interface HallOfFameNarrativeInput extends Omit<EditorialInput, "legacy"> {
  legacy?: LegacyContext;
}

/** Build an EditorialContext tuned for a Hall of Fame entry narrative. */
export function buildHallOfFameNarrativeContext(input: HallOfFameNarrativeInput): EditorialContext {
  const ctx = buildEditorialContext(input as EditorialInput);
  if (input.legacy) ctx.legacy = input.legacy;
  return ctx;
}
