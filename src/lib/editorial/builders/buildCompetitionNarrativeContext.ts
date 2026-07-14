import { buildEditorialContext } from "../context";
import type { EditorialContext, EditorialInput, CompetitionProfileContext } from "../types";

export interface CompetitionNarrativeInput extends Omit<EditorialInput, "competitionProfile"> {
  competitionProfile?: CompetitionProfileContext;
}

/** Build an EditorialContext tuned for a competition profile narrative. */
export function buildCompetitionNarrativeContext(
  input: CompetitionNarrativeInput,
): EditorialContext {
  const ctx = buildEditorialContext(input as EditorialInput);
  if (input.competitionProfile) ctx.competitionProfile = input.competitionProfile;
  return ctx;
}
