import { buildEditorialContext } from "../context";
import type { EditorialContext, EditorialInput, EcosystemContext } from "../types";

export interface CountryNarrativeInput extends Omit<EditorialInput, "ecosystem"> {
  ecosystem?: EcosystemContext;
}

/** Build an EditorialContext tuned for a country profile narrative. */
export function buildCountryNarrativeContext(input: CountryNarrativeInput): EditorialContext {
  const ctx = buildEditorialContext(input as EditorialInput);
  if (input.ecosystem) ctx.ecosystem = input.ecosystem;
  return ctx;
}
