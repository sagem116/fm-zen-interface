import { buildEditorialContext } from "../context";
import type { EditorialContext, EditorialInput, CareerContext } from "../types";

export interface CoachNarrativeInput extends Omit<EditorialInput, "career"> {
  career?: CareerContext;
}

/** Build an EditorialContext tuned for a coach profile narrative. */
export function buildCoachNarrativeContext(input: CoachNarrativeInput): EditorialContext {
  const ctx = buildEditorialContext(input as EditorialInput);
  if (input.career) ctx.career = input.career;
  return ctx;
}
