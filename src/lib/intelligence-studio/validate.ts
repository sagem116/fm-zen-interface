/**
 * Studio-side validation. Runs against the merged effective config so it
 * catches broken references introduced by user overrides.
 */
import type { EngineConfig, RuleDef, TraitDef } from "@/lib/intelligence";

export interface ValidationIssue {
  scope: "rule" | "trait" | "profile" | "narrative";
  id: string;
  message: string;
}

export function validateConfig(cfg: EngineConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const metricIds = new Set(cfg.metrics.map((m) => m.id));
  const ruleIds = new Set(cfg.rules.map((r) => r.id));
  const traitIds = new Set(cfg.traits.map((t) => t.id));

  for (const r of cfg.rules) issues.push(...validateRule(r, metricIds));
  for (const t of cfg.traits) issues.push(...validateTrait(t, ruleIds));

  for (const p of cfg.profiles) {
    for (const tid of p.traitIds) {
      if (!traitIds.has(tid))
        issues.push({ scope: "profile", id: p.id, message: `Trait desconhecido: ${tid}` });
    }
  }

  for (const [tid, tpl] of Object.entries(cfg.narrativeTemplates ?? {})) {
    if (!traitIds.has(tid))
      issues.push({ scope: "narrative", id: tid, message: "Trait desconhecido" });
    if (!tpl.buckets?.length) issues.push({ scope: "narrative", id: tid, message: "Sem buckets" });
  }
  return issues;
}

export function validateRule(r: RuleDef, metricIds: Set<string>): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  if (!r.inputs?.length) out.push({ scope: "rule", id: r.id, message: "Sem inputs" });
  let sum = 0;
  for (const i of r.inputs ?? []) {
    if (!metricIds.has(i.metricId))
      out.push({ scope: "rule", id: r.id, message: `Métrica inexistente: ${i.metricId}` });
    if (!(i.weight > 0))
      out.push({ scope: "rule", id: r.id, message: `Peso inválido em ${i.metricId}` });
    if (i.direction !== "higher" && i.direction !== "lower")
      out.push({ scope: "rule", id: r.id, message: `Direção inválida em ${i.metricId}` });
    const n = i.normalize;
    if (!n || !("kind" in n))
      out.push({ scope: "rule", id: r.id, message: `Normalização em falta (${i.metricId})` });
    else if (n.kind === "linear" && !(n.max > n.min))
      out.push({ scope: "rule", id: r.id, message: `Limiares inválidos (${i.metricId})` });
    else if (n.kind === "threshold" && !Number.isFinite(n.at))
      out.push({ scope: "rule", id: r.id, message: `Threshold inválido (${i.metricId})` });
    sum += Math.max(0, i.weight);
  }
  if (sum <= 0) out.push({ scope: "rule", id: r.id, message: "Soma dos pesos é zero" });
  return out;
}

export function validateTrait(t: TraitDef, ruleIds: Set<string>): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  if (!ruleIds.has(t.ruleId))
    out.push({ scope: "trait", id: t.id, message: `Regra inexistente: ${t.ruleId}` });
  if (t.minScore != null && (t.minScore < 0 || t.minScore > 100))
    out.push({ scope: "trait", id: t.id, message: "minScore fora de 0..100" });
  for (const lv of t.levels ?? []) {
    if (lv.min < 0 || lv.min > 1)
      out.push({ scope: "trait", id: t.id, message: `Percentil de nível inválido: ${lv.min}` });
  }
  return out;
}
