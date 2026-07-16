// Position parsing for player_profiles.primary_position tokens
// Format examples: "GR", "D (C)", "D (DC)", "DA/M (D)", "MD", "M (C)", "MO (DEC)", "PL (C)"
// Base codes: GR (goalkeeper), D (central defender), DA (fullback/wing back),
// MD (defensive mid), M (midfielder), MO (attacking mid), PL (striker)

export type PositionGroup = "GK" | "DEF" | "MID" | "ATT";
export type PositionDetail =
  | "GK"
  | "CB"
  | "FB" // lateral
  | "DM"
  | "CM"
  | "AM"
  | "WING"
  | "ST";

export interface ParsedPosition {
  group: PositionGroup;
  details: Set<PositionDetail>;
  sides: Set<"L" | "R" | "C">;
  isWide: boolean;
}

const SIDE_MAP: Record<string, "L" | "R" | "C"> = {
  D: "R",
  E: "L",
  C: "C",
};

function parseSides(sides: string | undefined): Set<"L" | "R" | "C"> {
  const out = new Set<"L" | "R" | "C">();
  if (!sides) return out;
  for (const ch of sides.toUpperCase()) {
    const mapped = SIDE_MAP[ch];
    if (mapped) out.add(mapped);
  }
  return out;
}

function classifyBase(base: string, sides: Set<"L" | "R" | "C">): {
  group: PositionGroup;
  details: Set<PositionDetail>;
} {
  const details = new Set<PositionDetail>();
  let group: PositionGroup = "MID";
  switch (base) {
    case "GR":
      group = "GK";
      details.add("GK");
      break;
    case "D":
      group = "DEF";
      details.add("CB");
      break;
    case "DA":
      group = "DEF";
      details.add("FB");
      break;
    case "MD":
      group = "MID";
      details.add("DM");
      break;
    case "M":
      group = "MID";
      if (sides.has("L") || sides.has("R")) details.add("WING");
      else details.add("CM");
      break;
    case "MO":
      group = "ATT";
      if (sides.has("L") || sides.has("R")) details.add("WING");
      else details.add("AM");
      break;
    case "PL":
      group = "ATT";
      details.add("ST");
      break;
    default:
      group = "MID";
      details.add("CM");
  }
  return { group, details };
}

/** Parse `"DA/M (D)"` → up to N combined tokens. Returns primary group + all details. */
export function parsePrimaryPosition(raw: string | null | undefined): ParsedPosition {
  const detailsOut = new Set<PositionDetail>();
  const sidesOut = new Set<"L" | "R" | "C">();
  let group: PositionGroup = "MID";
  if (!raw) return { group, details: detailsOut, sides: sidesOut, isWide: false };

  // Split on comma (multiple positions like "D/DA (D), MD")
  const chunks = raw.split(",").map((s) => s.trim()).filter(Boolean);
  let firstGroup: PositionGroup | null = null;
  for (const chunk of chunks) {
    // "DA/M (D)" → bases=[DA, M], sides="D"
    const match = chunk.match(/^([A-Z/]+)(?:\s*\(([A-Z]+)\))?$/i);
    if (!match) continue;
    const bases = match[1].toUpperCase().split("/").filter(Boolean);
    const sides = parseSides(match[2]);
    for (const s of sides) sidesOut.add(s);
    for (const base of bases) {
      const c = classifyBase(base, sides);
      if (!firstGroup) firstGroup = c.group;
      for (const d of c.details) detailsOut.add(d);
    }
  }
  if (firstGroup) group = firstGroup;
  const isWide = sidesOut.has("L") || sidesOut.has("R");
  return { group, details: detailsOut, sides: sidesOut, isWide };
}

export function labelForGroup(g: PositionGroup): string {
  return { GK: "Guarda-redes", DEF: "Defesas", MID: "Médios", ATT: "Avançados" }[g];
}
export function labelForDetail(d: PositionDetail): string {
  return {
    GK: "Guarda-redes",
    CB: "Centrais",
    FB: "Laterais",
    DM: "Médios defensivos",
    CM: "Médios",
    AM: "Médios ofensivos",
    WING: "Extremos",
    ST: "Pontas de lança",
  }[d];
}
