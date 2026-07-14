export type {
  CanonicalScore,
  CanonicalScoreDocument,
  CanonicalWeightedRef,
  CanonicalRefKind,
  ResolvedRef,
  ResolutionReport,
  ResolutionCandidate,
} from "./types";

export { normalizeCanonicalToken, resolveCanonicalName, refreshCanonicalResolver, labelForInternalId } from "./resolver";
export { convertCanonicalToInternal, buildResolutionReport } from "./toInternal";
export type { ConversionResult, ConversionOptions } from "./toInternal";
export { convertInternalToCanonical, buildCanonicalDocument } from "./fromInternal";
export { canonicalExamples } from "./examples";

import type { CanonicalScore, CanonicalScoreDocument } from "./types";

export function parseCanonicalInput(json: string): CanonicalScore[] {
  const trimmed = json.trim();
  if (!trimmed) throw new Error("Input vazio.");
  const parsed = JSON.parse(trimmed) as unknown;

  const isCanonicalScore = (v: unknown): v is CanonicalScore =>
    !!v &&
    typeof v === "object" &&
    typeof (v as CanonicalScore).name === "string" &&
    typeof (v as CanonicalScore).entity === "string";

  if (Array.isArray(parsed)) {
    if (!parsed.every(isCanonicalScore)) throw new Error("Array não contém scores canónicos válidos.");
    return parsed;
  }
  if (parsed && typeof parsed === "object") {
    const asDoc = parsed as Partial<CanonicalScoreDocument> & Partial<CanonicalScore>;
    if (asDoc.format === "canonical-score" && Array.isArray(asDoc.scores)) {
      if (!asDoc.scores.every(isCanonicalScore)) throw new Error("Documento com scores inválidos.");
      return asDoc.scores;
    }
    if (isCanonicalScore(parsed)) return [parsed];
  }
  throw new Error("Formato canónico não reconhecido. Esperado objeto com { name, entity, ... }.");
}
