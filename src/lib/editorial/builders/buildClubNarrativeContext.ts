import { buildEditorialContext } from "../context";
import type { EditorialContext, EditorialInput, InstitutionContext } from "../types";

export interface ClubNarrativeInput extends Omit<EditorialInput, "institution"> {
  institution?: InstitutionContext;
}

/** Build an EditorialContext tuned for a club profile narrative. */
export function buildClubNarrativeContext(input: ClubNarrativeInput): EditorialContext {
  const ctx = buildEditorialContext(input as EditorialInput);
  if (input.institution) ctx.institution = input.institution;
  return ctx;
}
