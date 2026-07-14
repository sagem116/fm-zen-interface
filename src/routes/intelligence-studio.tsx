/**
 * Intelligence Studio — central admin page for the Intelligence Engine.
 *
 * The Studio never mutates the engine internals. It edits a StudioProfile
 * (an override patch) which is merged with the engine's defaultConfig at
 * runtime.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Brain,
  Copy,
  Download,
  Info,
  Pencil,
  Plus,
  Ruler,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { defaultConfig } from "@/lib/intelligence";
import type { EntityKind, MetricDef, ProfileDef, RuleDef, TraitDef } from "@/lib/intelligence";
import {
  DEFAULT_BUILTIN_ID,
  appendChange,
  deleteProfile,
  duplicateProfile,
  emptyProfile,
  exportAll,
  importAll,
  saveSettings,
  setActiveProfile,
  upsertProfile,
  useStudioProfiles,
  useStudioSettings,
} from "@/lib/intelligence-studio/store";
import { mergeConfig } from "@/lib/intelligence-studio/merge";
import { validateConfig, validateRule, validateTrait } from "@/lib/intelligence-studio/validate";
import type { StudioNarrativeTemplate, StudioProfile } from "@/lib/intelligence-studio/types";

export const Route = createFileRoute("/intelligence-studio")({
  head: () => ({
    meta: [
      { title: "Intelligence Studio — FM World Rankings" },
      {
        name: "description",
        content:
          "Administração declarativa do Intelligence Engine: traits, regras, métricas, perfis e narrativas.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IntelligenceStudioPage,
});

const KIND_LABEL: Record<EntityKind, string> = {
  club: "Clube",
  player: "Jogador",
  coach: "Treinador",
  competition: "Competição",
  country: "País",
};

const KIND_OPTIONS: EntityKind[] = ["club", "player", "coach", "competition", "country"];

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ==============================================================
// Page shell
// ==============================================================

function IntelligenceStudioPage() {
  const profiles = useStudioProfiles();
  const settings = useStudioSettings();
  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === settings.activeProfileId) ?? profiles[0],
    [profiles, settings.activeProfileId],
  );

  const [editingProfileId, setEditingProfileId] = useState<string>(activeProfile.id);
  const editing = useMemo(
    () => profiles.find((p) => p.id === editingProfileId) ?? activeProfile,
    [profiles, editingProfileId, activeProfile],
  );

  const mergedConfig = useMemo(() => mergeConfig(editing), [editing]);
  const issues = useMemo(() => validateConfig(mergedConfig), [mergedConfig]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
                <Brain className="size-6 text-gold" />
                Intelligence Studio
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Centro de administração declarativa do Intelligence Engine. Toda a configuração aqui
                editada é consumida pelo motor sem alterações de código.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <ShieldCheck className="size-3" />
                Engine v{defaultConfig.version}
              </Badge>
              <Badge variant={issues.length ? "destructive" : "secondary"}>
                {issues.length ? `${issues.length} problemas` : "Configuração válida"}
              </Badge>
            </div>
          </header>

          <ProfileBar
            profiles={profiles}
            editingId={editingProfileId}
            activeId={settings.activeProfileId}
            onChangeEditing={setEditingProfileId}
          />

          {issues.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">
                {issues.slice(0, 5).map((i, k) => (
                  <div key={k}>
                    <b>{i.scope}</b> · {i.id} — {i.message}
                  </div>
                ))}
                {issues.length > 5 && <div>… e mais {issues.length - 5}.</div>}
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="traits" className="space-y-4">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="traits">
                <Star className="size-4 mr-1" />
                Características
              </TabsTrigger>
              <TabsTrigger value="rules">
                <Ruler className="size-4 mr-1" />
                Regras
              </TabsTrigger>
              <TabsTrigger value="metrics">
                <Sparkles className="size-4 mr-1" />
                Métricas
              </TabsTrigger>
              <TabsTrigger value="profiles">
                <ShieldCheck className="size-4 mr-1" />
                Perfis
              </TabsTrigger>
              <TabsTrigger value="narratives">
                <BookOpen className="size-4 mr-1" />
                Narrativas
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings2 className="size-4 mr-1" />
                Definições
              </TabsTrigger>
              <TabsTrigger value="io">
                <Download className="size-4 mr-1" />
                Import / Export
              </TabsTrigger>
            </TabsList>

            <TabsContent value="traits">
              <TraitsTab profile={editing} config={mergedConfig} />
            </TabsContent>
            <TabsContent value="rules">
              <RulesTab profile={editing} config={mergedConfig} />
            </TabsContent>
            <TabsContent value="metrics">
              <MetricsTab config={mergedConfig} />
            </TabsContent>
            <TabsContent value="profiles">
              <ProfilesTab profile={editing} config={mergedConfig} />
            </TabsContent>
            <TabsContent value="narratives">
              <NarrativesTab profile={editing} config={mergedConfig} />
            </TabsContent>
            <TabsContent value="settings">
              <SettingsTab />
            </TabsContent>
            <TabsContent value="io">
              <IOTab />
            </TabsContent>
          </Tabs>
        </div>
      </TooltipProvider>
  );
}

// ==============================================================
// Profile bar
// ==============================================================

function ProfileBar({
  profiles,
  editingId,
  activeId,
  onChangeEditing,
}: {
  profiles: StudioProfile[];
  editingId: string;
  activeId: string;
  onChangeEditing: (id: string) => void;
}) {
  const editing = profiles.find((p) => p.id === editingId) ?? profiles[0];
  const [name, setName] = useState(editing.name);

  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const saveMeta = () => {
    upsertProfile({ ...editing, name });
    appendChange(editing.id, `Renomeado para "${name}"`);
    toast.success("Perfil atualizado");
  };

  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap items-end gap-3">
        <div className="grow min-w-[220px]">
          <Label className="text-xs text-muted-foreground">A editar perfil</Label>
          <Select
            value={editingId}
            onValueChange={(v) => {
              onChangeEditing(v);
              const p = profiles.find((x) => x.id === v);
              if (p) setName(p.name);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.id === activeId ? " · ativo" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[220px]">
          <Label className="text-xs text-muted-foreground">Nome</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={editing.id === DEFAULT_BUILTIN_ID}
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={saveMeta}
            disabled={editing.id === DEFAULT_BUILTIN_ID}
          >
            <Save className="size-4 mr-1" />
            Guardar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const c = duplicateProfile(editing.id);
              if (c) {
                onChangeEditing(c.id);
                setName(c.name);
                toast.success("Perfil duplicado");
              }
            }}
          >
            <Copy className="size-4 mr-1" />
            Duplicar
          </Button>
          <Button
            size="sm"
            variant={editing.id === activeId ? "secondary" : "default"}
            onClick={() => {
              setActiveProfile(editing.id);
              toast.success("Perfil ativado");
            }}
          >
            <ShieldCheck className="size-4 mr-1" />
            {editing.id === activeId ? "Ativo" : "Ativar"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={editing.id === DEFAULT_BUILTIN_ID}
            onClick={() => {
              deleteProfile(editing.id);
              onChangeEditing(DEFAULT_BUILTIN_ID);
              toast.success("Perfil eliminado");
            }}
          >
            <Trash2 className="size-4 mr-1" />
            Eliminar
          </Button>
          <Sheet open={newOpen} onOpenChange={setNewOpen}>
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="size-4 mr-1" />
              Novo
            </Button>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Novo perfil</SheetTitle>
                <SheetDescription>Cria um novo perfil de configuração vazio.</SheetDescription>
              </SheetHeader>
              <div className="py-4 space-y-3">
                <Label>Nome</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ex: Realista"
                />
              </div>
              <SheetFooter>
                <Button
                  onClick={() => {
                    const id = `studio.profile.${slugify(newName) || Date.now()}`;
                    upsertProfile(emptyProfile(id, newName || "Sem nome"));
                    onChangeEditing(id);
                    setNewName("");
                    setNewOpen(false);
                    toast.success("Perfil criado");
                  }}
                >
                  Criar
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
        <div className="w-full text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
          <span>versão {editing.version}</span>
          <span>criado {new Date(editing.createdAt).toLocaleString("pt-PT")}</span>
          <span>atualizado {new Date(editing.updatedAt).toLocaleString("pt-PT")}</span>
          <span>alterações {editing.changeLog.length}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ==============================================================
// Traits tab
// ==============================================================

function TraitsTab({
  profile,
  config,
}: {
  profile: StudioProfile;
  config: ReturnType<typeof mergeConfig>;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | EntityKind>("all");
  const [editing, setEditing] = useState<TraitDef | null>(null);
  const isDefault = profile.id === DEFAULT_BUILTIN_ID;

  const filtered = config.traits.filter((t) => {
    if (kind !== "all" && t.kind !== kind) return false;
    if (query && !`${t.label} ${t.id} ${t.group}`.toLowerCase().includes(query.toLowerCase()))
      return false;
    return true;
  });

  const save = (t: TraitDef) => {
    const upsertTraits = [...profile.upsertTraits.filter((x) => x.id !== t.id), t];
    const removedTraitIds = profile.removedTraitIds.filter((id) => id !== t.id);
    upsertProfile({ ...profile, upsertTraits, removedTraitIds });
    appendChange(profile.id, `Trait atualizado: ${t.label}`);
    toast.success("Trait guardado");
    setEditing(null);
  };

  const remove = (id: string) => {
    const upsertTraits = profile.upsertTraits.filter((t) => t.id !== id);
    const removedTraitIds = Array.from(new Set([...profile.removedTraitIds, id]));
    upsertProfile({ ...profile, upsertTraits, removedTraitIds });
    appendChange(profile.id, `Trait removido: ${id}`);
    toast.success("Trait removido");
  };

  const duplicate = (t: TraitDef) => {
    const copy: TraitDef = {
      ...t,
      id: `${t.id}.copy.${Date.now().toString(36)}`,
      label: `${t.label} (cópia)`,
    };
    setEditing(copy);
  };

  const create = () => {
    setEditing({
      id: `trait.custom.${Date.now().toString(36)}`,
      kind: "club",
      group: "custom",
      label: "Nova Característica",
      polarity: "positive",
      ruleId: config.rules[0]?.id ?? "",
      minScore: 55,
      levels: [
        { min: 0.85, label: "Muito Alto" },
        { min: 0.7, label: "Alto" },
        { min: 0.55, label: "Médio" },
      ],
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
        <CardTitle className="text-base">
          Características ({filtered.length}/{config.traits.length})
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Pesquisar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-52"
          />
          <Select value={kind} onValueChange={(v) => setKind(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as entidades</SelectItem>
              {KIND_OPTIONS.map((k) => (
                <SelectItem key={k} value={k}>
                  {KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={create} disabled={isDefault}>
            <Plus className="size-4 mr-1" />
            Novo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isDefault && (
          <p className="text-xs text-muted-foreground mb-3">
            Perfil "Padrão" é só leitura — duplica ou cria um novo perfil para editar.
          </p>
        )}
        <div className="max-h-[520px] overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trait</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Polaridade</TableHead>
                <TableHead>Regra</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="font-medium">{t.label}</div>
                    <div className="text-[11px] text-muted-foreground">{t.id}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{KIND_LABEL[t.kind]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t.group}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{t.polarity}</TableCell>
                  <TableCell className="text-xs">{t.ruleId}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(t)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={isDefault}
                      onClick={() => duplicate(t)}
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={isDefault}
                      onClick={() => remove(t.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">
                    Sem resultados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <TraitEditor
        trait={editing}
        rules={config.rules}
        readOnly={isDefault}
        onClose={() => setEditing(null)}
        onSave={save}
      />
    </Card>
  );
}

function TraitEditor({
  trait,
  rules,
  readOnly,
  onClose,
  onSave,
}: {
  trait: TraitDef | null;
  rules: RuleDef[];
  readOnly: boolean;
  onClose: () => void;
  onSave: (t: TraitDef) => void;
}) {
  const [draft, setDraft] = useState<TraitDef | null>(trait);
  // sync draft when trait changes
  useMemoSync(() => setDraft(trait), [trait]);

  return (
    <Sheet open={!!trait} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        {draft && (
          <>
            <SheetHeader>
              <SheetTitle>Editar característica</SheetTitle>
              <SheetDescription className="text-xs">{draft.id}</SheetDescription>
            </SheetHeader>
            <div className="py-4 space-y-3">
              <Field label="Nome">
                <Input
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                />
              </Field>
              <Field label="Descrição">
                <Textarea
                  rows={2}
                  value={draft.description ?? ""}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Entidade">
                  <Select
                    value={draft.kind}
                    onValueChange={(v) => setDraft({ ...draft, kind: v as EntityKind })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KIND_OPTIONS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {KIND_LABEL[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Grupo">
                  <Input
                    value={draft.group}
                    onChange={(e) => setDraft({ ...draft, group: e.target.value })}
                  />
                </Field>
                <Field label="Polaridade">
                  <Select
                    value={draft.polarity}
                    onValueChange={(v) => setDraft({ ...draft, polarity: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positive">Positiva</SelectItem>
                      <SelectItem value="negative">Negativa</SelectItem>
                      <SelectItem value="neutral">Neutra</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Regra">
                  <Select
                    value={draft.ruleId}
                    onValueChange={(v) => setDraft({ ...draft, ruleId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {rules
                        .filter((r) => r.kind === draft.kind)
                        .map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.label ?? r.id}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Score mínimo (0-100)">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.minScore ?? 55}
                    onChange={(e) => setDraft({ ...draft, minScore: Number(e.target.value) })}
                  />
                </Field>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Níveis (percentil → etiqueta)</Label>
                <div className="space-y-2">
                  {(draft.levels ?? []).map((lv, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        type="number"
                        step={0.05}
                        min={0}
                        max={1}
                        value={lv.min}
                        onChange={(e) => {
                          const levels = [...(draft.levels ?? [])];
                          levels[i] = { ...lv, min: Number(e.target.value) };
                          setDraft({ ...draft, levels });
                        }}
                        className="w-24"
                      />
                      <Input
                        value={lv.label}
                        onChange={(e) => {
                          const levels = [...(draft.levels ?? [])];
                          levels[i] = { ...lv, label: e.target.value };
                          setDraft({ ...draft, levels });
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const levels = (draft.levels ?? []).filter((_, k) => k !== i);
                          setDraft({ ...draft, levels });
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        levels: [...(draft.levels ?? []), { min: 0.5, label: "Novo" }],
                      })
                    }
                  >
                    <Plus className="size-4 mr-1" />
                    Adicionar nível
                  </Button>
                </div>
              </div>
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button disabled={readOnly} onClick={() => onSave(draft)}>
                Guardar
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ==============================================================
// Rules tab
// ==============================================================

function RulesTab({
  profile,
  config,
}: {
  profile: StudioProfile;
  config: ReturnType<typeof mergeConfig>;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | EntityKind>("all");
  const [editing, setEditing] = useState<RuleDef | null>(null);
  const isDefault = profile.id === DEFAULT_BUILTIN_ID;

  const filtered = config.rules.filter((r) => {
    if (kind !== "all" && r.kind !== kind) return false;
    if (query && !`${r.label ?? ""} ${r.id}`.toLowerCase().includes(query.toLowerCase()))
      return false;
    return true;
  });

  const save = (r: RuleDef) => {
    const upsertRules = [...profile.upsertRules.filter((x) => x.id !== r.id), r];
    const removedRuleIds = profile.removedRuleIds.filter((id) => id !== r.id);
    upsertProfile({ ...profile, upsertRules, removedRuleIds });
    appendChange(profile.id, `Regra atualizada: ${r.label ?? r.id}`);
    toast.success("Regra guardada");
    setEditing(null);
  };

  const remove = (id: string) => {
    const upsertRules = profile.upsertRules.filter((r) => r.id !== id);
    const removedRuleIds = Array.from(new Set([...profile.removedRuleIds, id]));
    upsertProfile({ ...profile, upsertRules, removedRuleIds });
    appendChange(profile.id, `Regra removida: ${id}`);
    toast.success("Regra removida");
  };

  const duplicate = (r: RuleDef) => {
    setEditing({
      ...r,
      id: `${r.id}.copy.${Date.now().toString(36)}`,
      label: `${r.label ?? r.id} (cópia)`,
    });
  };

  const create = () => {
    setEditing({
      id: `rule.custom.${Date.now().toString(36)}`,
      kind: "club",
      label: "Nova regra",
      aggregate: "weightedMean",
      inputs: [
        {
          metricId: config.metrics.find((m) => m.kind === "club")?.id ?? "",
          weight: 1,
          direction: "higher",
          normalize: { kind: "percentile" },
        },
      ],
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
        <CardTitle className="text-base">
          Regras ({filtered.length}/{config.rules.length})
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Pesquisar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-52"
          />
          <Select value={kind} onValueChange={(v) => setKind(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {KIND_OPTIONS.map((k) => (
                <SelectItem key={k} value={k}>
                  {KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={create} disabled={isDefault}>
            <Plus className="size-4 mr-1" />
            Nova
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isDefault && (
          <p className="text-xs text-muted-foreground mb-3">Perfil "Padrão" é só leitura.</p>
        )}
        <div className="max-h-[520px] overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Regra</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Inputs</TableHead>
                <TableHead>Agregação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.label ?? r.id}</div>
                    <div className="text-[11px] text-muted-foreground">{r.id}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{KIND_LABEL[r.kind]}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{r.inputs.length}</TableCell>
                  <TableCell className="text-xs">{r.aggregate}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(r)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={isDefault}
                      onClick={() => duplicate(r)}
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={isDefault}
                      onClick={() => remove(r.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                    Sem resultados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <RuleEditor
        rule={editing}
        metrics={config.metrics}
        readOnly={isDefault}
        onClose={() => setEditing(null)}
        onSave={save}
      />
    </Card>
  );
}

function RuleEditor({
  rule,
  metrics,
  readOnly,
  onClose,
  onSave,
}: {
  rule: RuleDef | null;
  metrics: MetricDef[];
  readOnly: boolean;
  onClose: () => void;
  onSave: (r: RuleDef) => void;
}) {
  const [draft, setDraft] = useState<RuleDef | null>(rule);
  useMemoSync(() => setDraft(rule), [rule]);

  const metricIds = useMemo(() => new Set(metrics.map((m) => m.id)), [metrics]);
  const issues = draft ? validateRule(draft, metricIds) : [];
  const availableMetrics = draft ? metrics.filter((m) => m.kind === draft.kind) : [];

  const move = (i: number, dir: -1 | 1) => {
    if (!draft) return;
    const inputs = [...draft.inputs];
    const j = i + dir;
    if (j < 0 || j >= inputs.length) return;
    [inputs[i], inputs[j]] = [inputs[j], inputs[i]];
    setDraft({ ...draft, inputs });
  };

  return (
    <Sheet open={!!rule} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        {draft && (
          <>
            <SheetHeader>
              <SheetTitle>Editar regra</SheetTitle>
              <SheetDescription className="text-xs">{draft.id}</SheetDescription>
            </SheetHeader>
            <div className="py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome">
                  <Input
                    value={draft.label ?? ""}
                    onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  />
                </Field>
                <Field label="Entidade">
                  <Select
                    value={draft.kind}
                    onValueChange={(v) => setDraft({ ...draft, kind: v as EntityKind, inputs: [] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KIND_OPTIONS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {KIND_LABEL[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Agregação">
                  <Select
                    value={draft.aggregate}
                    onValueChange={(v) => setDraft({ ...draft, aggregate: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weightedMean">Média Ponderada</SelectItem>
                      <SelectItem value="min">Mínimo</SelectItem>
                      <SelectItem value="max">Máximo</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Inputs</Label>
                <div className="space-y-2">
                  {draft.inputs.map((inp, i) => (
                    <Card key={i} className="p-3">
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5">
                          <Label className="text-[10px]">Métrica</Label>
                          <Select
                            value={inp.metricId}
                            onValueChange={(v) => {
                              const inputs = [...draft.inputs];
                              inputs[i] = { ...inp, metricId: v };
                              setDraft({ ...draft, inputs });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar…" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableMetrics.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[10px]">Peso</Label>
                          <Input
                            type="number"
                            step={0.05}
                            min={0}
                            value={inp.weight}
                            onChange={(e) => {
                              const inputs = [...draft.inputs];
                              inputs[i] = { ...inp, weight: Number(e.target.value) };
                              setDraft({ ...draft, inputs });
                            }}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[10px]">Direção</Label>
                          <Select
                            value={inp.direction}
                            onValueChange={(v) => {
                              const inputs = [...draft.inputs];
                              inputs[i] = { ...inp, direction: v as any };
                              setDraft({ ...draft, inputs });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="higher">↑ Maior</SelectItem>
                              <SelectItem value="lower">↓ Menor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[10px]">Normalização</Label>
                          <Select
                            value={inp.normalize.kind}
                            onValueChange={(v) => {
                              const inputs = [...draft.inputs];
                              let normalize: any;
                              if (v === "linear") normalize = { kind: "linear", min: 0, max: 1 };
                              else if (v === "threshold")
                                normalize = { kind: "threshold", at: 0, band: 0.1 };
                              else normalize = { kind: v };
                              inputs[i] = { ...inp, normalize };
                              setDraft({ ...draft, inputs });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentile">Percentil</SelectItem>
                              <SelectItem value="linear">Linear</SelectItem>
                              <SelectItem value="threshold">Threshold</SelectItem>
                              <SelectItem value="identity">Identity</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1 flex flex-col gap-1">
                          <Button size="icon" variant="ghost" onClick={() => move(i, -1)}>
                            <ArrowUp className="size-3" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => move(i, 1)}>
                            <ArrowDown className="size-3" />
                          </Button>
                        </div>
                        {inp.normalize.kind === "linear" && (
                          <>
                            <div className="col-span-3">
                              <Label className="text-[10px]">Min</Label>
                              <Input
                                type="number"
                                value={inp.normalize.min}
                                onChange={(e) => {
                                  const inputs = [...draft.inputs];
                                  inputs[i] = {
                                    ...inp,
                                    normalize: {
                                      ...(inp.normalize as any),
                                      min: Number(e.target.value),
                                    },
                                  };
                                  setDraft({ ...draft, inputs });
                                }}
                              />
                            </div>
                            <div className="col-span-3">
                              <Label className="text-[10px]">Max</Label>
                              <Input
                                type="number"
                                value={inp.normalize.max}
                                onChange={(e) => {
                                  const inputs = [...draft.inputs];
                                  inputs[i] = {
                                    ...inp,
                                    normalize: {
                                      ...(inp.normalize as any),
                                      max: Number(e.target.value),
                                    },
                                  };
                                  setDraft({ ...draft, inputs });
                                }}
                              />
                            </div>
                          </>
                        )}
                        {inp.normalize.kind === "threshold" && (
                          <>
                            <div className="col-span-3">
                              <Label className="text-[10px]">At</Label>
                              <Input
                                type="number"
                                value={inp.normalize.at}
                                onChange={(e) => {
                                  const inputs = [...draft.inputs];
                                  inputs[i] = {
                                    ...inp,
                                    normalize: {
                                      ...(inp.normalize as any),
                                      at: Number(e.target.value),
                                    },
                                  };
                                  setDraft({ ...draft, inputs });
                                }}
                              />
                            </div>
                            <div className="col-span-3">
                              <Label className="text-[10px]">Banda</Label>
                              <Input
                                type="number"
                                value={inp.normalize.band ?? 0}
                                onChange={(e) => {
                                  const inputs = [...draft.inputs];
                                  inputs[i] = {
                                    ...inp,
                                    normalize: {
                                      ...(inp.normalize as any),
                                      band: Number(e.target.value),
                                    },
                                  };
                                  setDraft({ ...draft, inputs });
                                }}
                              />
                            </div>
                          </>
                        )}
                        <div className="col-span-12 flex justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setDraft({ ...draft, inputs: draft.inputs.filter((_, k) => k !== i) })
                            }
                          >
                            <Trash2 className="size-3.5 mr-1" />
                            Remover
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        inputs: [
                          ...draft.inputs,
                          {
                            metricId: availableMetrics[0]?.id ?? "",
                            weight: 1,
                            direction: "higher",
                            normalize: { kind: "percentile" },
                          },
                        ],
                      })
                    }
                  >
                    <Plus className="size-4 mr-1" />
                    Adicionar input
                  </Button>
                </div>
              </div>

              {issues.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs space-y-1">
                    {issues.map((i, k) => (
                      <div key={k}>{i.message}</div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button disabled={readOnly || issues.length > 0} onClick={() => onSave(draft)}>
                Guardar
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ==============================================================
// Metrics tab
// ==============================================================

function MetricsTab({ config }: { config: ReturnType<typeof mergeConfig> }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | EntityKind>("all");

  const filtered = config.metrics.filter((m) => {
    if (kind !== "all" && m.kind !== kind) return false;
    if (query && !`${m.label} ${m.id}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          Métricas ({filtered.length}/{config.metrics.length})
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              As métricas são registadas em código pelo Metric Registry. Aparecem aqui
              automaticamente.
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        <div className="flex gap-2">
          <Input
            placeholder="Pesquisar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-52"
          />
          <Select value={kind} onValueChange={(v) => setKind(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {KIND_OPTIONS.map((k) => (
                <SelectItem key={k} value={k}>
                  {KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[520px] overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Identificador</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.label}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.id}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{KIND_LABEL[m.kind]}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{m.unit ?? "—"}</TableCell>
                  <TableCell className="text-xs">{m.description ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={m.discoverable ? "secondary" : "outline"}>
                      {m.discoverable ? "Ativa" : "Interna"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ==============================================================
// Profiles tab
// ==============================================================

function ProfilesTab({
  profile,
  config,
}: {
  profile: StudioProfile;
  config: ReturnType<typeof mergeConfig>;
}) {
  const [editing, setEditing] = useState<ProfileDef | null>(null);
  const isDefault = profile.id === DEFAULT_BUILTIN_ID;

  const save = (p: ProfileDef) => {
    const upsertProfiles = [...profile.upsertProfiles.filter((x) => x.id !== p.id), p];
    const removedProfileIds = profile.removedProfileIds.filter((id) => id !== p.id);
    upsertProfile({ ...profile, upsertProfiles, removedProfileIds });
    appendChange(profile.id, `Perfil de entidade atualizado: ${p.label}`);
    toast.success("Perfil guardado");
    setEditing(null);
  };

  const remove = (id: string) => {
    const upsertProfiles = profile.upsertProfiles.filter((p) => p.id !== id);
    const removedProfileIds = Array.from(new Set([...profile.removedProfileIds, id]));
    upsertProfile({ ...profile, upsertProfiles, removedProfileIds });
    appendChange(profile.id, `Perfil de entidade removido: ${id}`);
    toast.success("Removido");
  };

  const create = () =>
    setEditing({
      id: `profile.custom.${Date.now().toString(36)}`,
      kind: "club",
      label: "Novo perfil",
      traitIds: [],
    });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Perfis de entidade ({config.profiles.length})</CardTitle>
        <Button size="sm" onClick={create} disabled={isDefault}>
          <Plus className="size-4 mr-1" />
          Novo
        </Button>
      </CardHeader>
      <CardContent>
        {isDefault && (
          <p className="text-xs text-muted-foreground mb-3">Perfil "Padrão" é só leitura.</p>
        )}
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Perfil</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Traits</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.profiles.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.label}</div>
                    <div className="text-[11px] text-muted-foreground">{p.id}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{KIND_LABEL[p.kind]}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{p.traitIds.length}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(p)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={isDefault}
                      onClick={() => remove(p.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <ProfileEntityEditor
        entity={editing}
        traits={config.traits}
        readOnly={isDefault}
        onClose={() => setEditing(null)}
        onSave={save}
      />
    </Card>
  );
}

function ProfileEntityEditor({
  entity,
  traits,
  readOnly,
  onClose,
  onSave,
}: {
  entity: ProfileDef | null;
  traits: TraitDef[];
  readOnly: boolean;
  onClose: () => void;
  onSave: (p: ProfileDef) => void;
}) {
  const [draft, setDraft] = useState<ProfileDef | null>(entity);
  useMemoSync(() => setDraft(entity), [entity]);
  const options = draft ? traits.filter((t) => t.kind === draft.kind) : [];

  return (
    <Sheet open={!!entity} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        {draft && (
          <>
            <SheetHeader>
              <SheetTitle>Editar perfil de entidade</SheetTitle>
              <SheetDescription className="text-xs">{draft.id}</SheetDescription>
            </SheetHeader>
            <div className="py-4 space-y-3">
              <Field label="Nome">
                <Input
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                />
              </Field>
              <Field label="Entidade">
                <Select
                  value={draft.kind}
                  onValueChange={(v) => setDraft({ ...draft, kind: v as EntityKind, traitIds: [] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KIND_OPTIONS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {KIND_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div>
                <Label className="text-xs">Traits incluídos</Label>
                <div className="mt-2 max-h-64 overflow-auto border rounded-md p-2 space-y-1">
                  {options.map((t) => {
                    const checked = draft.traitIds.includes(t.id);
                    return (
                      <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const traitIds = e.target.checked
                              ? [...draft.traitIds, t.id]
                              : draft.traitIds.filter((x) => x !== t.id);
                            setDraft({ ...draft, traitIds });
                          }}
                        />
                        <span>{t.label}</span>
                        <Badge variant="secondary" className="text-[10px] ml-auto">
                          {t.group}
                        </Badge>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button disabled={readOnly} onClick={() => onSave(draft)}>
                Guardar
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ==============================================================
// Narratives tab
// ==============================================================

function NarrativesTab({
  profile,
  config,
}: {
  profile: StudioProfile;
  config: ReturnType<typeof mergeConfig>;
}) {
  const [editing, setEditing] = useState<{
    traitId: string;
    buckets: { minScore: number; text: string }[];
  } | null>(null);
  const isDefault = profile.id === DEFAULT_BUILTIN_ID;

  // Snapshot text form of current effective narratives (defaults hide the function form).
  const overrides = useMemo(
    () => new Map(profile.upsertNarratives.map((n) => [n.traitId, n])),
    [profile],
  );
  const rows = config.traits.map((t) => ({
    trait: t,
    override: overrides.get(t.id),
    hasDefault: !!defaultConfig.narrativeTemplates?.[t.id],
  }));

  const save = (t: StudioNarrativeTemplate) => {
    const upsertNarratives = [
      ...profile.upsertNarratives.filter((n) => n.traitId !== t.traitId),
      t,
    ];
    const removedNarrativeTraitIds = profile.removedNarrativeTraitIds.filter(
      (id) => id !== t.traitId,
    );
    upsertProfile({ ...profile, upsertNarratives, removedNarrativeTraitIds });
    appendChange(profile.id, `Narrativa atualizada: ${t.traitId}`);
    toast.success("Narrativa guardada");
    setEditing(null);
  };

  const remove = (traitId: string) => {
    const upsertNarratives = profile.upsertNarratives.filter((n) => n.traitId !== traitId);
    const removedNarrativeTraitIds = Array.from(
      new Set([...profile.removedNarrativeTraitIds, traitId]),
    );
    upsertProfile({ ...profile, upsertNarratives, removedNarrativeTraitIds });
    appendChange(profile.id, `Narrativa removida: ${traitId}`);
    toast.success("Removida");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Templates de narrativa</CardTitle>
        <span className="text-[11px] text-muted-foreground">
          Tokens: {"{name}"} {"{score}"} {"{level}"} {"{group}"}
        </span>
      </CardHeader>
      <CardContent>
        {isDefault && (
          <p className="text-xs text-muted-foreground mb-3">Perfil "Padrão" é só leitura.</p>
        )}
        <div className="max-h-[520px] overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trait</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Buckets</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ trait, override, hasDefault }) => (
                <TableRow key={trait.id}>
                  <TableCell>
                    <div className="font-medium">{trait.label}</div>
                    <div className="text-[11px] text-muted-foreground">{trait.id}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{KIND_LABEL[trait.kind]}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {override?.buckets.length ?? (hasDefault ? "—" : 0)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={override ? "secondary" : "outline"}>
                      {override ? "Personalizado" : hasDefault ? "Padrão" : "Sem template"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setEditing({
                          traitId: trait.id,
                          buckets: override?.buckets ?? [
                            {
                              minScore: 0.7,
                              text: `${trait.label}: {name} destaca-se (score {score}/100).`,
                            },
                          ],
                        })
                      }
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={isDefault || !override}
                      onClick={() => remove(trait.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {editing && (
            <>
              <SheetHeader>
                <SheetTitle>Editar narrativa</SheetTitle>
                <SheetDescription className="text-xs">{editing.traitId}</SheetDescription>
              </SheetHeader>
              <div className="py-4 space-y-3">
                {editing.buckets.map((b, i) => (
                  <Card key={i} className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Score mínimo</Label>
                      <Input
                        type="number"
                        step={0.05}
                        min={0}
                        max={1}
                        value={b.minScore}
                        onChange={(e) => {
                          const buckets = [...editing.buckets];
                          buckets[i] = { ...b, minScore: Number(e.target.value) };
                          setEditing({ ...editing, buckets });
                        }}
                        className="w-24"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="ml-auto"
                        onClick={() =>
                          setEditing({
                            ...editing,
                            buckets: editing.buckets.filter((_, k) => k !== i),
                          })
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <Textarea
                      rows={3}
                      value={b.text}
                      onChange={(e) => {
                        const buckets = [...editing.buckets];
                        buckets[i] = { ...b, text: e.target.value };
                        setEditing({ ...editing, buckets });
                      }}
                    />
                    <div className="text-[11px] text-muted-foreground">
                      Prévia:{" "}
                      {b.text
                        .replaceAll("{name}", "FC Exemplo")
                        .replaceAll("{score}", "78")
                        .replaceAll("{level}", "Alto")
                        .replaceAll("{group}", "plantel")}
                    </div>
                  </Card>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setEditing({
                      ...editing,
                      buckets: [
                        ...editing.buckets,
                        { minScore: 0.55, text: "{name} — {score}/100" },
                      ],
                    })
                  }
                >
                  <Plus className="size-4 mr-1" />
                  Adicionar bucket
                </Button>
              </div>
              <SheetFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
                <Button disabled={isDefault} onClick={() => save(editing)}>
                  Guardar
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}

// ==============================================================
// Settings + IO tabs
// ==============================================================

function SettingsTab() {
  const settings = useStudioSettings();
  const profiles = useStudioProfiles();
  const set = (patch: Partial<typeof settings>) => saveSettings({ ...settings, ...patch });

  const toggles: { key: keyof typeof settings; label: string; hint: string }[] = [
    {
      key: "showEvidence",
      label: "Mostrar evidências",
      hint: "Exibe a tabela de métricas por trait.",
    },
    { key: "showConfidence", label: "Mostrar confiança", hint: "Percentagem de inputs não-nulos." },
    { key: "showPercentiles", label: "Mostrar percentis", hint: "Exibe percentis da coorte." },
    {
      key: "showMetrics",
      label: "Mostrar métricas utilizadas",
      hint: "Lista de métricas por trait.",
    },
    {
      key: "onlyStrong",
      label: "Apenas características fortes",
      hint: "Oculta traits com score baixo.",
    },
    {
      key: "groupByCategory",
      label: "Agrupar por categoria",
      hint: "Organiza traits pelos seus grupos.",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuração global</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Perfil ativo</Label>
            <Select
              value={settings.activeProfileId}
              onValueChange={(v) => set({ activeProfileId: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {toggles.map(({ key, label, hint }) => (
            <div key={key} className="flex items-start justify-between gap-3 py-1">
              <div>
                <Label className="text-sm">{label}</Label>
                <p className="text-[11px] text-muted-foreground">{hint}</p>
              </div>
              <Switch
                checked={Boolean(settings[key])}
                onCheckedChange={(v) => set({ [key]: v } as any)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Perfil ativo</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          {(() => {
            const p = profiles.find((x) => x.id === settings.activeProfileId) ?? profiles[0];
            return (
              <>
                <div>
                  <b>{p.name}</b>{" "}
                  <Badge variant="outline" className="ml-1">
                    v{p.version}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{p.description || "Sem descrição."}</p>
                <div className="text-[11px] text-muted-foreground pt-2">
                  <div>
                    Traits override: {p.upsertTraits.length} / removidos: {p.removedTraitIds.length}
                  </div>
                  <div>
                    Regras override: {p.upsertRules.length} / removidas: {p.removedRuleIds.length}
                  </div>
                  <div>Narrativas override: {p.upsertNarratives.length}</div>
                </div>
                <div className="pt-3">
                  <div className="text-xs font-semibold mb-1">Histórico</div>
                  <div className="max-h-40 overflow-auto text-[11px] space-y-1">
                    {[...p.changeLog].reverse().map((c, i) => (
                      <div key={i}>
                        <span className="text-muted-foreground">
                          {new Date(c.at).toLocaleString("pt-PT")}
                        </span>{" "}
                        — {c.summary}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}

function IOTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const doExport = () => {
    const data = exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intelligence-studio-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const doImport = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(String(r.result));
        const res = importAll(parsed);
        if (res.ok) toast.success("Importação concluída");
        else toast.error(res.error ?? "Falha na importação");
      } catch {
        toast.error("Ficheiro inválido");
      }
    };
    r.readAsText(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Importação / Exportação</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button onClick={doExport}>
          <Download className="size-4 mr-1" />
          Exportar JSON
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="size-4 mr-1" />
          Importar JSON
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) doImport(f);
            e.target.value = "";
          }}
        />
        <p className="w-full text-xs text-muted-foreground">
          O ficheiro exportado contém todas as definições e perfis do Studio e mantém
          compatibilidade com o formato declarativo do Intelligence Engine.
        </p>
      </CardContent>
    </Card>
  );
}

// ==============================================================
// Small helpers
// ==============================================================

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

/** Runs `effect` synchronously whenever `deps` change (useEffect-lite, no async). */
function useMemoSync(effect: () => void, deps: React.DependencyList) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(effect, deps);
}
