import type { ScoreResult } from "@/lib/scores";
import type { BreakdownContribution, BreakdownSlice } from "./types";

const SECTION_LABEL: Record<BreakdownSlice["section"], string> = {
  attributes: "Atributos",
  metrics: "Métricas",
  contexts: "Contexto",
  modifiers: "Modificadores",
};

function humanize(id: string): string {
  const tail = id.split(".").slice(1).join(".") || id;
  return tail.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildBreakdown(result: ScoreResult | null | undefined): {
  slices: BreakdownSlice[];
  top: BreakdownContribution[];
} {
  if (!result?.breakdown) return { slices: [], top: [] };
  const sections = result.breakdown.sections;
  const totalAbs = sections.reduce((sum, s) => sum + Math.abs(s.subtotal || 0), 0) || 1;

  const slices: BreakdownSlice[] = [];
  const allContribs: BreakdownContribution[] = [];

  for (const section of sections) {
    const kind = section.id as BreakdownSlice["section"];
    const label = SECTION_LABEL[kind] ?? section.label ?? section.id;
    const contribs: BreakdownContribution[] = (section.items ?? [])
      .filter((it) => it.contribution != null)
      .map((it) => ({
        id: it.id,
        label: humanize(it.id),
        contribution: it.contribution ?? 0,
        weight: it.weight ?? 0,
        section: kind,
      }))
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    slices.push({
      section: kind,
      label,
      subtotal: section.subtotal ?? 0,
      share: Math.abs(section.subtotal || 0) / totalAbs,
      top: contribs.slice(0, 5),
    });
    allContribs.push(...contribs);
  }

  const top = allContribs
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 6);

  return { slices, top };
}
