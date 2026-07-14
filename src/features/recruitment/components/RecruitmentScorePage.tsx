import { useMemo, useState } from "react";
import { Copy, Download, FileJson, RotateCcw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  duplicateRecruitmentScorePreset,
  exportRecruitmentScorePresetsJSON,
  importRecruitmentScorePresets,
  restoreRecruitmentScoreDefaults,
  setActiveRecruitmentScorePreset,
  upsertRecruitmentScorePreset,
  useRecruitmentScoreSettingsState,
} from "../services/recruitment-score-settings";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";
import { useRecruitmentKnowledgeBoard } from "../hooks/useRecruitmentKnowledgeBoard";
import { RecruitmentLayout } from "./RecruitmentLayout";
import { RecruitmentSection } from "./RecruitmentSection";
import { buildRecruitmentBreadcrumbs } from "../utils/recruitment-breadcrumbs";
import type { RecruitmentScoreCriterionId } from "../types/recruitment-models";

const LABELS: Record<RecruitmentScoreCriterionId, string> = {
  ranking: "Ranking",
  scores: "Scores",
  tacticalCompatibility: "Compatibilidade Tática",
  psychological: "Perfil Psicológico",
  potential: "Potencial",
  age: "Idade",
  value: "Valor",
  salary: "Salário",
  form: "Forma",
  consistency: "Consistência",
  versatility: "Versatilidade",
  style: "Estilo",
  risk: "Risco",
  intelligence: "Inteligência",
  history: "Histórico",
};

export function RecruitmentScorePage() {
  const [importText, setImportText] = useState("");
  const settings = useRecruitmentScoreSettingsState();
  const { source } = useRecruitmentSourceData();

  const active =
    settings.presets.find((preset) => preset.id === settings.activePresetId) ?? settings.presets[0];

  const board = useRecruitmentKnowledgeBoard({
    tab: "player",
    query: "",
    minCompatibility: 0,
    profileId: "gegenpress",
    sortBy: "recruitmentScore",
    sortDir: "desc",
  });

  const topRows = useMemo(() => board.rows.slice(0, 8), [board.rows]);

  const updateCriterion = (
    criterion: RecruitmentScoreCriterionId,
    patch: { enabled?: boolean; weight?: number },
  ) => {
    if (!active) return;
    upsertRecruitmentScorePreset({
      ...active,
      criteria: {
        ...active.criteria,
        [criterion]: {
          ...active.criteria[criterion],
          ...patch,
        },
      },
    });
  };

  const toggleScoreId = (scoreId: string, checked: boolean) => {
    if (!active) return;
    const set = new Set(active.selectedScoreIds);
    if (checked) set.add(scoreId);
    else set.delete(scoreId);
    upsertRecruitmentScorePreset({
      ...active,
      selectedScoreIds: [...set],
      scoreSelectionMode: "selected",
    });
  };

  return (
    <RecruitmentLayout
      title="Recruitment Score"
      subtitle="Configuração determinística do score exclusivo de recrutamento."
      breadcrumbs={buildRecruitmentBreadcrumbs("Recruitment Score")}
      headerActions={
        <>
          <Button variant="outline" onClick={() => duplicateRecruitmentScorePreset(active.id)}>
            <Copy className="size-4" /> Duplicar preset
          </Button>
          <Button
            variant="outline"
            onClick={() => navigator.clipboard.writeText(exportRecruitmentScorePresetsJSON())}
          >
            <Download className="size-4" /> Exportar JSON
          </Button>
          <Button variant="outline" onClick={restoreRecruitmentScoreDefaults}>
            <RotateCcw className="size-4" /> Restaurar default
          </Button>
        </>
      }
      isLoading={board.isLoading}
    >
      <RecruitmentSection
        title="Perfis de Avaliação"
        description="Múltiplos presets com pesos configuráveis."
      >
        <Card>
          <CardContent className="pt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <Label>Preset ativo</Label>
              <Select value={active.id} onValueChange={setActiveRecruitmentScorePreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings.presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input
                value={active.name}
                onChange={(e) => upsertRecruitmentScorePreset({ ...active, name: e.target.value })}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Descrição</Label>
              <Input
                value={active.description ?? ""}
                onChange={(e) =>
                  upsertRecruitmentScorePreset({ ...active, description: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>
      </RecruitmentSection>

      <RecruitmentSection
        title="Critérios"
        description="Ativar, desativar e ajustar pesos de cada componente."
      >
        <Card>
          <CardContent className="pt-5 grid gap-2 md:grid-cols-2">
            {(Object.keys(active.criteria) as RecruitmentScoreCriterionId[]).map((criterion) => (
              <div key={criterion} className="rounded-md border border-border px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{LABELS[criterion]}</p>
                  <Switch
                    checked={active.criteria[criterion].enabled}
                    onCheckedChange={(checked) => updateCriterion(criterion, { enabled: checked })}
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Peso</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={active.criteria[criterion].weight}
                    onChange={(e) =>
                      updateCriterion(criterion, { weight: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </RecruitmentSection>

      <RecruitmentSection
        title="Scores"
        description="Aplicar todos os scores ou apenas alguns do Score Studio."
      >
        <Card>
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm">Modo de seleção</p>
              <Select
                value={active.scoreSelectionMode}
                onValueChange={(value) =>
                  upsertRecruitmentScorePreset({
                    ...active,
                    scoreSelectionMode: value as "all" | "selected",
                  })
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="selected">Apenas alguns</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {active.scoreSelectionMode === "selected" ? (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {(source?.catalogs.scores ?? []).map((score) => {
                  const checked = active.selectedScoreIds.includes(score.id);
                  return (
                    <label
                      key={score.id}
                      className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => toggleScoreId(score.id, Boolean(next))}
                      />
                      <span>{score.name}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Todos os scores ativos serão considerados automaticamente.
              </p>
            )}
          </CardContent>
        </Card>
      </RecruitmentSection>

      <RecruitmentSection title="Importar e Exportar" description="Gestão de presets em JSON.">
        <Card>
          <CardContent className="pt-5 space-y-3">
            <Input
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='Cola JSON aqui e clica em "Importar JSON"'
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => importRecruitmentScorePresets(importText)}>
                <FileJson className="size-4" /> Importar JSON
              </Button>
              <Button
                variant="outline"
                onClick={() => navigator.clipboard.writeText(exportRecruitmentScorePresetsJSON())}
              >
                <Save className="size-4" /> Copiar JSON de presets
              </Button>
            </div>
          </CardContent>
        </Card>
      </RecruitmentSection>

      <RecruitmentSection
        title="Resultado"
        description="Preview do Recruitment Score e Explain por entidade."
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top candidatos por Recruitment Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topRows.map((row) => (
              <div key={row.id} className="rounded-md border border-border px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.club ?? "-"} · {row.country ?? "-"}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    Recruitment Score {row.recruitmentScore.toFixed(1)}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {row.explain.contributions.slice(0, 6).map((item) => (
                    <Badge key={`${row.id}-${item.criterion}`} variant="outline">
                      {LABELS[item.criterion as RecruitmentScoreCriterionId] ?? item.criterion}:{" "}
                      {item.impactPercent}%
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </RecruitmentSection>
    </RecruitmentLayout>
  );
}
