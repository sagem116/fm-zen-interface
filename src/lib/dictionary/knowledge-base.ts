/**
 * Dictionary v2 — Knowledge Base Intelligence
 *
 * Provides smart discovery of metadata for unknown tokens and
 * intelligent suggestions for canonical mappings.
 * Deterministic. No LLM. No network calls.
 */
import type {
  DictionaryCategory,
  DictionaryDataType,
  DictionaryEntry,
  DictionaryEntity,
  DictionaryImportContext,
  DictionarySmartSuggestion,
  DictionarySubcategory,
} from "./types";
import { normalizeDictionaryToken } from "./resolver";

/* ---- Attribute subcategory tables ---- */
const TECHNICAL_KEYS = new Set([
  "corners", "crossing", "dribbling", "finishing", "first_touch",
  "free_kick_taking", "heading", "long_shots", "long_throws",
  "marking_and_positioning", "passing", "penalty_taking",
  "technique", "throwing", "tackling", "concentration",
]);
const MENTAL_KEYS = new Set([
  "aggression", "anticipation", "bravery", "composure", "concentration",
  "decisions", "determination", "flair", "leadership", "off_the_ball",
  "positioning", "teamwork", "vision", "work_rate",
]);
const PHYSICAL_KEYS = new Set([
  "acceleration", "agility", "balance", "jumping_reach",
  "natural_fitness", "pace", "stamina", "strength",
]);
const GK_KEYS = new Set([
  "aerial_reach", "command_of_area", "communication", "eccentricity",
  "handling", "kicking", "one_on_ones", "punching_tendency",
  "reflexes", "rushing_out",
]);

/* ---- Metric subcategory patterns ---- */
const PASSING_RE = /pass|assist|cross|corner|key_pass|xa|exp_assist/;
const SHOOTING_RE = /goal|shot|xg|npg|penalty|np_xg|finish/;
const DEFENDING_RE = /tackle|intercep|clearance|block|recovery|aerial_duel|duels/;
const POSSESSION_RE = /dribble|touch|carry|possession|ball_ret|progressive/;
const DISCIPLINE_RE = /yellow|red|card|foul|offside/;
const CREATION_RE = /chance|key_pass|expected_assist/;
const PROGRESSION_RE = /prog_pass|prog_carry|progressive/;
const PHYSICAL_METRIC_RE = /km_run|sprint|distance|high_intensity/;

function inferAttrSubcategory(key: string): DictionarySubcategory | undefined {
  if (TECHNICAL_KEYS.has(key)) return "technical";
  if (MENTAL_KEYS.has(key)) return "mental";
  if (PHYSICAL_KEYS.has(key)) return "physical";
  if (GK_KEYS.has(key)) return "goalkeeper";
  return undefined;
}

function inferMetricSubcategory(key: string): DictionarySubcategory | undefined {
  if (PASSING_RE.test(key)) return "passing";
  if (SHOOTING_RE.test(key)) return "shooting";
  if (DEFENDING_RE.test(key)) return "defending";
  if (POSSESSION_RE.test(key)) return "possession";
  if (DISCIPLINE_RE.test(key)) return "discipline";
  if (CREATION_RE.test(key)) return "creation";
  if (PROGRESSION_RE.test(key)) return "progression";
  if (PHYSICAL_METRIC_RE.test(key)) return "physical_metric";
  return undefined;
}

/** Infer subcategory from category + name. */
export function inferSubcategory(
  category: DictionaryCategory,
  name: string,
): DictionarySubcategory | undefined {
  const key = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (category === "attribute") return inferAttrSubcategory(key);
  if (category === "metric") return inferMetricSubcategory(key);
  return undefined;
}

/** Detect likely unit from a field token. */
export function detectDictionaryUnit(token: string): string | undefined {
  const t = token.toLowerCase();
  if (t.includes("/90") || t.includes("per90") || t.includes("p90") || t.includes("per_90"))
    return "per 90 min";
  if (t.endsWith("%") || t.includes("pct") || t.includes("percent") || t.includes("accuracy"))
    return "%";
  if (t.includes("km") || t.includes("distance")) return "km";
  if (t.includes("sprint")) return "sprints";
  if (t.includes("goal") && !t.includes("keeper")) return "goals";
  if (t.includes("assist")) return "assists";
  if (t.includes("pass") && !t.includes("impasse")) return "passes";
  return undefined;
}

/** Detect likely data type from a field token. */
export function detectDictionaryDataType(token: string): DictionaryDataType {
  const t = token.toLowerCase();
  if (t.endsWith("%") || t.includes("pct") || t.includes("percent")) return "number";
  if (t.includes("date") || t.includes("season")) return "date";
  if (t.startsWith("is_") || t.startsWith("has_")) return "boolean";
  return "number";
}

/** Detect likely category from token + aliases. */
export function detectDictionaryCategory(
  token: string,
  aliases: string[] = [],
): DictionaryCategory {
  const t = token.toLowerCase();
  if (["name", "id", "uid", "idu", "identifier"].some((k) => t.includes(k))) return "identifier";
  if (["country", "nationality", "club", "position", "competition", "league", "continent"].some(
    (k) => t.includes(k),
  ))
    return "context";
  if (["age", "height", "weight", "salary", "value", "wage", "foot", "personality"].some(
    (k) => t.includes(k),
  ))
    return "profile_field";
  if (["ca", "cp", "pa", "ra", "rm", "rc"].some((k) => t === k)) return "rating";

  const allText = [t, ...aliases.map((a) => a.toLowerCase())].join(" ");
  const attributeHints = [
    "acceleration", "agility", "balance", "stamina", "strength", "dribbling",
    "finishing", "heading", "passing", "technique", "composure", "decisions",
    "vision", "workrate", "anticipation", "bravery", "leadership", "aggression",
    "concentration", "reflexes", "handling", "jumping",
  ];
  if (attributeHints.some((hint) => allText.includes(hint))) return "attribute";

  return "metric";
}

/** Infer likely import contexts from aliases. */
export function discoverImportContexts(aliases: string[]): DictionaryImportContext[] {
  const text = aliases.join(" ").toLowerCase();
  const result: DictionaryImportContext[] = [];
  if (text.includes("player") || text.includes("jogador")) result.push("import_players");
  if (text.includes("competition") || text.includes("liga") || text.includes("competição"))
    result.push("import_competitions");
  if (text.includes("coach") || text.includes("treinador")) result.push("import_coaches");
  if (text.includes("club") || text.includes("clube")) result.push("import_clubs");
  if (text.includes("country") || text.includes("país") || text.includes("pais"))
    result.push("import_countries");
  if (text.includes("international") || text.includes("seleção")) result.push("import_international");
  return result;
}

/** Find similar existing entries for a given token. */
export function findSimilarDictionaryEntries(
  token: string,
  entries: DictionaryEntry[],
  limit = 5,
): DictionaryEntry[] {
  const normalized = normalizeDictionaryToken(token) ?? "";
  if (!normalized) return [];

  const scored = entries
    .map((entry) => {
      const entryKey = normalizeDictionaryToken(entry.key) ?? "";
      const entryName = normalizeDictionaryToken(entry.name) ?? "";
      const aliasMatch = entry.aliases.some((a) => {
        const an = normalizeDictionaryToken(a) ?? "";
        return an === normalized || an.includes(normalized) || normalized.includes(an);
      });
      let score = 0;
      if (entryKey === normalized || entryName === normalized) score += 100;
      else if (entryKey.includes(normalized) || normalized.includes(entryKey)) score += 60;
      else if (entryName.includes(normalized) || normalized.includes(entryName)) score += 50;
      if (aliasMatch) score += 30;
      return { entry, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.entry);

  return scored;
}

/**
 * Suggest a canonical dictionary mapping for an unknown token.
 * Returns null if the token is empty.
 */
export function suggestDictionaryMapping(
  token: string,
  existingEntries: DictionaryEntry[],
): DictionarySmartSuggestion | null {
  const normalized = normalizeDictionaryToken(token);
  if (!normalized) return null;

  const slug = normalized
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  // Exact alias/key match → 100% confidence
  const exact = existingEntries.find(
    (e) =>
      normalizeDictionaryToken(e.key) === normalized ||
      normalizeDictionaryToken(e.name) === normalized ||
      e.aliases.some((a) => normalizeDictionaryToken(a) === normalized),
  );
  if (exact) {
    return {
      suggestedId: exact.id,
      confidence: 100,
      reason: `Correspondência exacta com "${exact.name}" (${exact.id}).`,
      similarIds: [exact.id],
      category: exact.category,
      subcategory: exact.subcategory,
      entity: exact.entity,
      dataType: exact.dataType,
      unit: exact.unit,
    };
  }

  // Heuristic inference
  const category = detectDictionaryCategory(normalized, [token]);
  const entity: DictionaryEntity = "player";
  const dataType = detectDictionaryDataType(normalized);
  const unit = detectDictionaryUnit(normalized);
  const subcategory = inferSubcategory(category, normalized);
  const similar = findSimilarDictionaryEntries(token, existingEntries, 5);

  const domainPart =
    category === "metric"
      ? "metric"
      : category === "attribute"
        ? "attribute"
        : category === "identifier"
          ? "identifier"
          : category === "profile_field"
            ? "profile"
            : category === "rating"
              ? "rating"
              : "context";
  const suggestedId = `${entity}.${domainPart}.${slug}`;

  let confidence = 40;
  if (similar.length > 0) confidence += 20;
  if (subcategory) confidence += 10;
  if (unit) confidence += 10;
  if (dataType !== "number") confidence += 5;
  if (similar.length >= 3) confidence += 5;

  const reasons: string[] = [`Categoria inferida: "${category}".`];
  if (subcategory) reasons.push(`Subcategoria: "${subcategory}".`);
  if (similar.length > 0) {
    reasons.push(`Padrão semelhante a: ${similar.slice(0, 3).map((e) => e.name).join(", ")}.`);
  }
  if (unit) reasons.push(`Unidade detectada: ${unit}.`);

  return {
    suggestedId,
    confidence: Math.min(99, confidence),
    reason: reasons.join(" "),
    similarIds: similar.map((e) => e.id),
    category,
    subcategory,
    entity,
    context: undefined,
    dataType,
    unit,
  };
}
