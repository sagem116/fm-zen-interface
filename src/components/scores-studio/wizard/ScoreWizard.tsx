import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Wand2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listAttributes,
  listContexts,
  listMetrics,
  listModifiers,
  evaluateScore,
  type AttributeDefinition,
  type MetricDefinition,
  type ContextDefinition,
  type ModifierDefinition,
  type ScoreDefinition,
  type ScoreEntityKind,
} from "@/lib/scores";
import { SmartPicker, type SmartPickerItem } from "./SmartPicker";
import { canonicalExamples, convertCanonicalToInternal } from "@/lib/scores/canonical";
import type { CanonicalScore } from "@/lib/scores/canonical";

type Kind = "attribute" | "metric" | "context" | "modifier";
type Selections = Record<Kind, Record<string, { weight: number }>>;

const ENTITY_LABELS: Record<ScoreEntityKind, string> = {
  player: "Jogador",
  club: "Clube",
  coach: "Treinador",
  competition: "Competição",
  country: "País",
};

const CATEGORY_SUGGESTIONS = [
  "Ataque",
  "Defesa",
  "Meio-campo",
  "Financeiro",
  "Reputação",
  "Histórico",
  "Físico",
  "Mental",
  "Técnico",
  "Resultados",
];

const STEPS = [
  { key: "entity", label: "Entidade" },
  { key: "template", label: "Template" },
  { key: "meta", label: "Nome & categoria" },
  { key: "attributes", label: "Atributos" },
  { key: "metrics", label: "Métricas" },
  { key: "contextsmods", label: "Contexto & Modificadores" },
  { key: "preview", label: "Preview" },
] as const;

function toPickerItems<
  T extends { id: string; metadata?: { name?: string; abbreviation?: string; description?: string; categoryId?: string; tags?: string[] } },
>(defs: T[]): SmartPickerItem[] {
  return defs.map((d) => ({
    id: d.id,
    name: d.metadata?.name ?? d.id,
    abbreviation: d.metadata?.abbreviation,
    aliases: d.metadata?.tags ?? [],
    subcategory: (d.metadata?.categoryId ?? "").replace(/^.*_category\./, "") || undefined,
    description: d.metadata?.description,
  }));
}

function defaultValueForId(id: string): number {
  if (id.startsWith("attribute.")) return 12;
  if (id.startsWith("metric.")) return 50;
  if (id.startsWith("context.")) return 60;
  if (id.startsWith("modifier.")) return 50;
  return 50;
}

function randomizedValueForId(id: string, seed: number): number {
  const base = defaultValueForId(id);
  const spread = id.startsWith("attribute.") ? 6 : 25;
  const rand = Math.sin(seed * 9301 + id.length * 49297) * 0.5 + 0.5;
  return Math.max(0, Math.round(base + (rand - 0.5) * 2 * spread));
}

function buildInputForScore(
  score: ScoreDefinition,
  entityId: string,
  seed: number,
) {
  const build = <T extends { attributeId?: string; metricId?: string; contextId?: string; modifierId?: string; weight?: number }>(
    refs: T[] | undefined,
    idKey: keyof T,
  ) =>
    (refs ?? []).map((r) => {
      const id = String(r[idKey]);
      return { id, value: randomizedValueForId(id, seed), weight: r.weight };
    });

  return {
    scoreId: score.id,
    entityKind: score.entityKind,
    entityId,
    attributes: build(score.attributeRefs, "attributeId" as const),
    metrics: build(score.metricRefs, "metricId" as const),
    contexts: build(score.contextRefs, "contextId" as const),
    modifiers: build(score.modifierRefs, "modifierId" as const),
  } as Parameters<typeof evaluateScore>[0];
}

interface ScoreWizardProps {
  onImport: (json: string) => { ok: boolean; message: string };
}

export function ScoreWizard({ onImport }: ScoreWizardProps) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [entity, setEntity] = useState<ScoreEntityKind>("player");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Ataque");
  const [description, setDescription] = useState("");
  const [selections, setSelections] = useState<Selections>({
    attribute: {},
    metric: {},
    context: {},
    modifier: {},
  });
  const [message, setMessage] = useState<string | null>(null);

  const reset = () => {
    setStepIndex(0);
    setEntity("player");
    setName("");
    setCategory("Ataque");
    setDescription("");
    setSelections({ attribute: {}, metric: {}, context: {}, modifier: {} });
    setMessage(null);
  };

  const filterByEntity = <T extends { entityKinds?: ScoreEntityKind[] }>(items: T[]) =>
    items.filter((i) => !i.entityKinds || i.entityKinds.length === 0 || i.entityKinds.includes(entity));

  const attributeItems = useMemo<SmartPickerItem[]>(
    () => toPickerItems(filterByEntity(listAttributes() as AttributeDefinition[])),
    [entity],
  );
  const metricItems = useMemo<SmartPickerItem[]>(
    () => toPickerItems(filterByEntity(listMetrics() as MetricDefinition[])),
    [entity],
  );
  const contextItems = useMemo<SmartPickerItem[]>(
    () => toPickerItems(filterByEntity(listContexts() as ContextDefinition[])),
    [entity],
  );
  const modifierItems = useMemo<SmartPickerItem[]>(
    () => toPickerItems(filterByEntity(listModifiers() as ModifierDefinition[])),
    [entity],
  );

  const toggle = (kind: Kind, id: string, on: boolean) => {
    setSelections((prev) => {
      const group = { ...prev[kind] };
      if (on) group[id] = { weight: group[id]?.weight ?? 10 };
      else delete group[id];
      return { ...prev, [kind]: group };
    });
  };

  const setWeight = (kind: Kind, id: string, weight: number) => {
    setSelections((prev) => ({
      ...prev,
      [kind]: { ...prev[kind], [id]: { weight } },
    }));
  };

  const applyTemplate = (canonical: CanonicalScore) => {
    setEntity(canonical.entity);
    setName(canonical.name);
    if (canonical.category) setCategory(canonical.category);
    if (canonical.description) setDescription(canonical.description);
    try {
      const { score } = convertCanonicalToInternal(canonical);
      const next: Selections = { attribute: {}, metric: {}, context: {}, modifier: {} };
      for (const r of score.attributeRefs ?? []) next.attribute[r.attributeId] = { weight: r.weight ?? 10 };
      for (const r of score.metricRefs ?? []) next.metric[r.metricId] = { weight: r.weight ?? 10 };
      for (const r of score.contextRefs ?? []) next.context[r.contextId] = { weight: r.weight ?? 10 };
      for (const r of score.modifierRefs ?? []) next.modifier[r.modifierId] = { weight: r.weight ?? 10 };
      setSelections(next);
    } catch {
      /* ignore template resolve issues */
    }
  };

  const draftScore = useMemo<ScoreDefinition>(() => {
    const canonical: CanonicalScore = {
      name: name.trim() || "New Score",
      entity,
      category: category.trim() || undefined,
      description: description.trim() || undefined,
      attributes: Object.entries(selections.attribute).map(([id, s]) => ({ name: id, weight: s.weight })),
      metrics: Object.entries(selections.metric).map(([id, s]) => ({ name: id, weight: s.weight })),
      contexts: Object.entries(selections.context).map(([id, s]) => ({ name: id, weight: s.weight })),
      modifiers: Object.entries(selections.modifier).map(([id, s]) => ({ name: id, weight: s.weight })),
    };
    // Selections already hold internal IDs; resolver will match by exact id via aliases/name.
    // To bypass resolver ambiguity, we build the ScoreDefinition directly:
    return {
      id: `score.wizard_${Date.now().toString(36)}` as ScoreDefinition["id"],
      name: canonical.name,
      entityKind: entity,
      categoryId: `score_category.${(canonical.category ?? "custom")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "custom"}` as ScoreDefinition["categoryId"],
      description: canonical.description,
      tags: category ? [category.toLowerCase()] : ["custom"],
      status: "draft",
      attributeRefs: Object.entries(selections.attribute).map(([attributeId, s]) => ({
        attributeId: attributeId as `attribute.${string}`,
        weight: s.weight,
      })),
      metricRefs: Object.entries(selections.metric).map(([metricId, s]) => ({
        metricId: metricId as `metric.${string}`,
        weight: s.weight,
      })),
      contextRefs: Object.entries(selections.context).map(([contextId, s]) => ({
        contextId: contextId as `context.${string}`,
        weight: s.weight,
      })),
      modifierRefs: Object.entries(selections.modifier).map(([modifierId, s]) => ({
        modifierId: modifierId as `modifier.${string}`,
        weight: s.weight,
      })),
      metadata: {
        source: "wizard",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category,
      },
    };
  }, [name, entity, category, description, selections]);

  const previewRanking = useMemo(() => {
    const totalRefs =
      (draftScore.attributeRefs?.length ?? 0) +
      (draftScore.metricRefs?.length ?? 0) +
      (draftScore.contextRefs?.length ?? 0) +
      (draftScore.modifierRefs?.length ?? 0);
    if (totalRefs === 0) return [];
    const sampleNames = Array.from({ length: 12 }, (_, i) => `${ENTITY_LABELS[entity]} #${i + 1}`);
    return sampleNames
      .map((n, i) => {
        try {
          const result = evaluateScore(buildInputForScore(draftScore, n, i + 1));
          return { name: n, score: Math.round(result.score ?? result.value ?? 0), grade: result.grade ?? "-" };
        } catch {
          return { name: n, score: 0, grade: "-" };
        }
      })
      .sort((a, b) => b.score - a.score);
  }, [draftScore, entity]);

  const distribution = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0];
    for (const item of previewRanking) {
      const idx = Math.min(4, Math.floor(item.score / 20));
      buckets[idx] += 1;
    }
    return buckets;
  }, [previewRanking]);

  const goNext = () => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));
  const step = STEPS[stepIndex];

  const totalSelected =
    Object.keys(selections.attribute).length +
    Object.keys(selections.metric).length +
    Object.keys(selections.context).length +
    Object.keys(selections.modifier).length;

  const canProceedFromMeta = name.trim().length > 0;
  const canSave = canProceedFromMeta && totalSelected > 0;

  const handleSave = () => {
    const result = onImport(JSON.stringify(draftScore));
    setMessage(result.message);
    if (result.ok) {
      setTimeout(() => {
        setOpen(false);
        reset();
      }, 600);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <Wand2 className="mr-1 size-4" />
          Assistente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Assistente de Score</DialogTitle>
          <DialogDescription>
            Cria um novo Score passo a passo. Nada é gravado até confirmares.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1 text-xs">
            {STEPS.map((s, i) => (
              <Badge
                key={s.key}
                variant={i === stepIndex ? "default" : i < stepIndex ? "secondary" : "outline"}
                className="cursor-pointer"
                onClick={() => setStepIndex(i)}
              >
                {i + 1}. {s.label}
              </Badge>
            ))}
          </div>
          <Progress value={((stepIndex + 1) / STEPS.length) * 100} />
        </div>

        <div className="min-h-[380px] py-2">
          {step.key === "entity" && (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {(Object.keys(ENTITY_LABELS) as ScoreEntityKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setEntity(k)}
                  className={`rounded-lg border p-4 text-left transition ${
                    entity === k ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                  }`}
                >
                  <div className="font-semibold">{ENTITY_LABELS[k]}</div>
                  <div className="text-xs text-muted-foreground">score.{k}</div>
                </button>
              ))}
            </div>
          )}

          {step.key === "template" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Escolhe um template oficial ou começa do zero.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelections({ attribute: {}, metric: {}, context: {}, modifier: {} });
                    setName("");
                  }}
                  className="rounded-lg border border-dashed p-4 text-left hover:bg-muted/40"
                >
                  <div className="font-semibold">Começar do zero</div>
                  <div className="text-xs text-muted-foreground">Sem pré-seleção.</div>
                </button>
                {Object.entries(canonicalExamples)
                  .filter(([, tpl]) => tpl.entity === entity)
                  .map(([key, tpl]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="rounded-lg border p-4 text-left hover:bg-muted/40"
                    >
                      <div className="font-semibold">{tpl.name}</div>
                      <div className="text-xs text-muted-foreground">{tpl.description}</div>
                      <div className="mt-2 flex flex-wrap gap-1 text-xs">
                        {tpl.category && <Badge variant="secondary">{tpl.category}</Badge>}
                        <Badge variant="outline">
                          {(tpl.attributes?.length ?? 0) + (tpl.metrics?.length ?? 0)} refs
                        </Badge>
                      </div>
                    </button>
                  ))}
                {Object.entries(canonicalExamples).filter(([, tpl]) => tpl.entity === entity)
                  .length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Sem templates para {ENTITY_LABELS[entity]}.
                  </p>
                )}
              </div>
            </div>
          )}

          {step.key === "meta" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Clinical Finisher"
                />
              </div>
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_SUGGESTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Descrição</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>
          )}

          {step.key === "attributes" && (
            <SmartPicker
              items={attributeItems}
              selected={selections.attribute}
              onToggle={(id, on) => toggle("attribute", id, on)}
              onWeight={(id, w) => setWeight("attribute", id, w)}
              emptyLabel="Sem atributos para esta entidade."
            />
          )}

          {step.key === "metrics" && (
            <SmartPicker
              items={metricItems}
              selected={selections.metric}
              onToggle={(id, on) => toggle("metric", id, on)}
              onWeight={(id, w) => setWeight("metric", id, w)}
              emptyLabel="Sem métricas para esta entidade."
            />
          )}

          {step.key === "contextsmods" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-semibold">Contextos</div>
                <SmartPicker
                  items={contextItems}
                  selected={selections.context}
                  onToggle={(id, on) => toggle("context", id, on)}
                  onWeight={(id, w) => setWeight("context", id, w)}
                  emptyLabel="Sem contextos disponíveis."
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold">Modificadores</div>
                <SmartPicker
                  items={modifierItems}
                  selected={selections.modifier}
                  onToggle={(id, on) => toggle("modifier", id, on)}
                  onWeight={(id, w) => setWeight("modifier", id, w)}
                  emptyLabel="Sem modificadores disponíveis."
                />
              </div>
            </div>
          )}

          {step.key === "preview" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-semibold">
                  Ranking simulado ({previewRanking.length})
                </div>
                <div className="max-h-[320px] overflow-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs">
                      <tr>
                        <th className="p-2 text-left">#</th>
                        <th className="p-2 text-left">Entidade</th>
                        <th className="p-2 text-right">Score</th>
                        <th className="p-2 text-right">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRanking.map((row, i) => (
                        <tr key={row.name} className="border-t">
                          <td className="p-2">{i + 1}</td>
                          <td className="p-2">{row.name}</td>
                          <td className="p-2 text-right tabular-nums">{row.score}</td>
                          <td className="p-2 text-right">{row.grade}</td>
                        </tr>
                      ))}
                      {previewRanking.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-3 text-center text-muted-foreground">
                            Adiciona pelo menos uma referência para calcular o preview.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold">Distribuição</div>
                <div className="space-y-1 rounded-md border p-3">
                  {distribution.map((count, i) => {
                    const total = distribution.reduce((a, b) => a + b, 0) || 1;
                    const label = ["0-19", "20-39", "40-59", "60-79", "80-100"][i];
                    return (
                      <div key={label} className="flex items-center gap-2 text-xs">
                        <span className="w-14 text-muted-foreground">{label}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(count / total) * 100}%` }}
                          />
                        </div>
                        <span className="w-6 text-right tabular-nums">{count}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-md border p-3 text-xs text-muted-foreground">
                  <div>
                    <b>Nome:</b> {name || "—"}
                  </div>
                  <div>
                    <b>Entidade:</b> {ENTITY_LABELS[entity]}
                  </div>
                  <div>
                    <b>Categoria:</b> {category || "—"}
                  </div>
                  <div>
                    <b>Total de refs:</b> {totalSelected}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {message && (
          <div className="rounded-md border bg-muted/40 p-2 text-sm">{message}</div>
        )}

        <DialogFooter className="justify-between sm:justify-between">
          <Button variant="ghost" onClick={goBack} disabled={stepIndex === 0}>
            Anterior
          </Button>
          {step.key === "preview" ? (
            <Button onClick={handleSave} disabled={!canSave}>
              Guardar Score
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={step.key === "meta" && !canProceedFromMeta}
            >
              Seguinte
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
