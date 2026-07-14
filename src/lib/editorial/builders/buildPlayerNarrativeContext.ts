import { buildEditorialContext } from "../context";
import type { EditorialContext, EditorialInput, CareerContext } from "../types";

export interface PlayerNarrativeInput extends Omit<EditorialInput, "career"> {
  career?: CareerContext;
}

/** Build an EditorialContext tuned for a player profile narrative. */
export function buildPlayerNarrativeContext(input: PlayerNarrativeInput): EditorialContext {
  const ctx = buildEditorialContext(input as EditorialInput);
  if (input.career) ctx.career = input.career;
  return ctx;
}
