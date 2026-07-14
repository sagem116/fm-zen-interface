import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  AttributeReference,
  AttributeId,
  ContextReference,
  ContextId,
  MetricReference,
  MetricId,
  ModifierReference,
  ModifierId,
  NormalizationRule,
  ScoreDefinition,
  ScoreEntityKind,
} from "@/lib/scores";
import type { ScoreStudioCatalogs } from "../Common/types";

interface Props {
  score: ScoreDefinition;
  catalogs: ScoreStudioCatalogs;
  normalizationOverrides: Record<string, NormalizationRule>;
  onSaveVersion: () => void;
  onUpdateScore: (updater: (score: ScoreDefinition) => ScoreDefinition) => void;
  onSetNormalizationOverride: (componentId: string, rule: NormalizationRule | null) => void;
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

function NormalizationEditor({
  componentId,
  rule,
  onChange,
}: {
  componentId: string;
  rule: NormalizationRule | undefined;
  onChange: (componentId: string, rule: NormalizationRule | null) => void;
}) {
  const kind = rule?.kind ?? "none";

  const updateRule = (patch: Partial<NormalizationRule>) => {
    if (!rule) return;
    onChange(componentId, { ...rule, ...patch } as NormalizationRule);
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      <Select
        value={kind}
        onValueChange={(value) => {
          if (value === "none") {
            onChange(componentId, null);
            return;
          }
          if (value === "identity") onChange(componentId, { kind: "identity", clamp: true });
          if (value === "range")
            onChange(componentId, { kind: "range", min: 0, max: 100, clamp: true });
          if (value === "percentage")
            onChange(componentId, { kind: "percentage", sourceMax: 100, clamp: true });
          if (value === "ratio")
            onChange(componentId, { kind: "ratio", denominator: 1, clamp: true });
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Normalização" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Default</SelectItem>
          <SelectItem value="identity">Identity</SelectItem>
          <SelectItem value="range">Range</SelectItem>
          <SelectItem value="percentage">Percentage</SelectItem>
          <SelectItem value="ratio">Ratio</SelectItem>
        </SelectContent>
      </Select>
      {rule?.kind === "range" && (
        <>
          <Input
            type="number"
            value={rule.min}
            onChange={(event) => updateRule({ min: Number(event.target.value) })}
            placeholder="Min"
          />
          <Input
            type="number"
            value={rule.max}
            onChange={(event) => updateRule({ max: Number(event.target.value) })}
            placeholder="Max"
          />
        </>
      )}
      {rule?.kind === "ratio" && (
        <Input
          type="number"
          value={rule.denominator}
          onChange={(event) => updateRule({ denominator: Number(event.target.value) })}
          placeholder="Denominator"
        />
      )}
      {rule?.kind === "percentage" && (
        <Select
          value={String(rule.sourceMax ?? 100)}
          onValueChange={(value) => updateRule({ sourceMax: Number(value) as 1 | 100 })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">0..1</SelectItem>
            <SelectItem value="100">0..100</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function ComponentSection<
  TId extends string,
  TField extends string,
  TRef extends { weight?: number } & Record<TField, TId>,
>({
  title,
  refs,
  options,
  idField,
  onChange,
  onNormalization,
  normalizationOverrides,
}: {
  title: string;
  refs: TRef[];
  options: Array<{ id: TId; label?: string; description?: string }>;
  idField: TField;
  onChange: (next: TRef[]) => void;
  onNormalization: (componentId: string, rule: NormalizationRule | null) => void;
  normalizationOverrides: Record<string, NormalizationRule>;
}) {
  const addRow = () => {
    if (!options[0]) return;
    const nextRow = { [idField]: options[0].id, weight: 1 } as TRef;
    onChange([...refs, nextRow]);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">{title}</CardTitle>
        <Button size="sm" variant="outline" onClick={addRow}>
          <Plus className="mr-1 size-4" /> Adicionar
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {refs.map((item, index) => {
          const componentId = String(item[idField] ?? "");
          return (
            <div key={`${title}-${index}`} className="rounded-md border p-2 space-y-2">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-7">
                  <Select
                    value={componentId}
                    onValueChange={(value) => {
                      const next = [...refs];
                      next[index] = { ...next[index], [idField]: value } as TRef;
                      onChange(next);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          <div className="flex flex-col">
                            <span>{option.label ?? option.id}</span>
                            {option.description ? (
                              <span className="text-[11px] text-muted-foreground">
                                {option.description}
                              </span>
                            ) : null}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.1"
                    value={Number(item.weight ?? 1)}
                    onChange={(event) => {
                      const next = [...refs];
                      next[index] = { ...next[index], weight: Number(event.target.value) } as TRef;
                      onChange(next);
                    }}
                  />
                </div>
                <div className="col-span-2">
                  <Button
                    variant="ghost"
                    className="w-full text-destructive"
                    onClick={() => onChange(refs.filter((_, i) => i !== index))}
                  >
                    Remover
                  </Button>
                </div>
              </div>
              <NormalizationEditor
                componentId={componentId}
                rule={normalizationOverrides[componentId]}
                onChange={onNormalization}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function ScoreEditor(props: Props) {
  const score = props.score;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Editor</CardTitle>
          <Button size="sm" onClick={props.onSaveVersion}>
            <Save className="mr-1 size-4" /> Guardar nova versão
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={score.name}
              onChange={(event) =>
                props.onUpdateScore((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input
              value={score.categoryId}
              onChange={(event) =>
                props.onUpdateScore((prev) => ({
                  ...prev,
                  categoryId: event.target.value as ScoreDefinition["categoryId"],
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Entidade</Label>
            <Select
              value={score.entityKind}
              onValueChange={(value) =>
                props.onUpdateScore((prev) => ({
                  ...prev,
                  entityKind: value as ScoreEntityKind,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="player">Player</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="club">Club</SelectItem>
                <SelectItem value="competition">Competition</SelectItem>
                <SelectItem value="country">Country</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={score.status ?? "draft"}
              onValueChange={(value) =>
                props.onUpdateScore((prev) => ({
                  ...prev,
                  status: value as ScoreDefinition["status"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">draft</SelectItem>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="deprecated">deprecated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Versão</Label>
            <Input
              value={score.version ?? "1.0.0"}
              onChange={(event) =>
                props.onUpdateScore((prev) => ({
                  ...prev,
                  version: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <Input
              value={(score.tags ?? []).join(", ")}
              onChange={(event) =>
                props.onUpdateScore((prev) => ({
                  ...prev,
                  tags: parseTags(event.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Posição</Label>
            <Input
              value={String((score.metadata?.position as string | undefined) ?? "")}
              onChange={(event) =>
                props.onUpdateScore((prev) => ({
                  ...prev,
                  metadata: {
                    ...(prev.metadata ?? {}),
                    position: event.target.value,
                  },
                }))
              }
              placeholder="Opcional"
            />
          </div>
          <div className="space-y-2">
            <Label>Duty</Label>
            <Input
              value={String((score.metadata?.duty as string | undefined) ?? "")}
              onChange={(event) =>
                props.onUpdateScore((prev) => ({
                  ...prev,
                  metadata: {
                    ...(prev.metadata ?? {}),
                    duty: event.target.value,
                  },
                }))
              }
              placeholder="Opcional"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Descrição</Label>
            <Textarea
              value={score.description ?? ""}
              onChange={(event) =>
                props.onUpdateScore((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <ComponentSection<AttributeId, "attributeId", AttributeReference>
        title="Attributes"
        refs={score.attributeRefs ?? []}
        options={props.catalogs.attributes.map((item) => ({
          id: item.id as `attribute.${string}`,
          label: item.abbreviation ?? item.name,
          description: item.description ?? item.id,
        }))}
        idField="attributeId"
        onChange={(next) =>
          props.onUpdateScore((prev) => ({
            ...prev,
            attributeRefs: next,
          }))
        }
        onNormalization={props.onSetNormalizationOverride}
        normalizationOverrides={props.normalizationOverrides}
      />

      <ComponentSection<MetricId, "metricId", MetricReference>
        title="Metrics"
        refs={score.metricRefs ?? []}
        options={props.catalogs.metrics.map((item) => ({
          id: item.id as `metric.${string}`,
          label: item.abbreviation ?? item.name,
          description: item.description ?? item.id,
        }))}
        idField="metricId"
        onChange={(next) =>
          props.onUpdateScore((prev) => ({
            ...prev,
            metricRefs: next,
          }))
        }
        onNormalization={props.onSetNormalizationOverride}
        normalizationOverrides={props.normalizationOverrides}
      />

      <ComponentSection<ContextId, "contextId", ContextReference>
        title="Contexts"
        refs={score.contextRefs ?? []}
        options={props.catalogs.contexts.map((item) => ({
          id: item.id as `context.${string}`,
          label: item.abbreviation ?? item.name,
          description: item.description ?? item.id,
        }))}
        idField="contextId"
        onChange={(next) =>
          props.onUpdateScore((prev) => ({
            ...prev,
            contextRefs: next,
          }))
        }
        onNormalization={props.onSetNormalizationOverride}
        normalizationOverrides={props.normalizationOverrides}
      />

      <ComponentSection<ModifierId, "modifierId", ModifierReference>
        title="Modifiers"
        refs={score.modifierRefs ?? []}
        options={props.catalogs.modifiers.map((item) => ({
          id: item.id as `modifier.${string}`,
          label: item.abbreviation ?? item.name,
          description: item.description ?? item.id,
        }))}
        idField="modifierId"
        onChange={(next) =>
          props.onUpdateScore((prev) => ({
            ...prev,
            modifierRefs: next,
          }))
        }
        onNormalization={props.onSetNormalizationOverride}
        normalizationOverrides={props.normalizationOverrides}
      />
    </div>
  );
}
