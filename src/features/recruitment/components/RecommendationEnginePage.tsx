import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  FileJson,
  FileSpreadsheet,
  FileText,
  Heart,
  PlusCircle,
  Send,
  ShieldQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFavorite } from "@/lib/profile/favorites";
import { fmtMoney } from "@/lib/fmt";
import { createObservation } from "../services/recruitment-observations";
import { upsertScoutReport } from "../services/recruitment-reports";
import { RECOMMENDATION_PRESETS } from "../services/recruitment-recommendations";
import { useRecruitmentRecommendationEngine } from "../hooks/useRecruitmentRecommendationEngine";
import {
  TACTICAL_PRESET_PROFILES,
  type TacticalProfileId,
} from "../constants/recruitment-tactical";
import { RecruitmentLayout } from "./RecruitmentLayout";
import { RecruitmentSection } from "./RecruitmentSection";
import { buildRecruitmentBreadcrumbs } from "../utils/recruitment-breadcrumbs";
import {
  exportRecommendationsPDF,
  exportRecommendationsTXT,
  exportRecruitmentResultsCSV,
  exportRecruitmentResultsJSON,
} from "../utils/recruitment-export";
import type { RecommendationCriterionId, RecommendationPreset } from "../types/recruitment-models";
import { RecruitmentPlayerExplainSheet } from "./explain/RecruitmentPlayerExplainSheet";

const CRITERION_LABELS: Record<RecommendationCriterionId, string> = {
  ranking: "Ranking",
  recruitmentScore: "Recruitment Score",
  compatibility: "Compatibilidade",
  age: "Idade",
  value: "Valor",
  salary: "Salário",
  potential: "Potencial",
  risk: "Risco",
  versatility: "Versatilidade",
  personality: "Personalidade",
  consistency: "Consistência",
  form: "Forma",
  style: "Estilo",
  psychological: "Perfil Psicológico",
  scoreOverall: "Score Overall",
  scorePosition: "Score da Posição",
};

function defaultPreset(objective: "player" | "coach"): RecommendationPreset {
  return (
    RECOMMENDATION_PRESETS.find((item) => item.objective === objective) ?? RECOMMENDATION_PRESETS[0]
  );
}

export function RecommendationEnginePage() {
  const [objective, setObjective] = useState<"player" | "coach">("player");
  const [roleOrPosition, setRoleOrPosition] = useState("");
  const [query, setQuery] = useState("");
  const [tacticalProfileId, setTacticalProfileId] = useState<TacticalProfileId>("gegenpress");
  const [minCompatibility, setMinCompatibility] = useState(60);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [presetId, setPresetId] = useState(defaultPreset("player").id);

  const availablePresets = useMemo(
    () => RECOMMENDATION_PRESETS.filter((item) => item.objective === objective),
    [objective],
  );
  const selectedPreset = useMemo(
    () => availablePresets.find((item) => item.id === presetId) ?? availablePresets[0],
    [availablePresets, presetId],
  );
  const [criteria, setCriteria] = useState(selectedPreset.criteria);

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [explainId, setExplainId] = useState<string | null>(null);

  const engine = useRecruitmentRecommendationEngine({
    objective,
    roleOrPosition,
    tacticalProfileId,
    query,
    minCompatibility,
    presetId: selectedPreset.id,
    criteria,
    sortDir,
  });

  const rows = engine.rows;

  const explainRow = rows.find((row) => row.id === explainId) ?? null;
  const compared = rows.filter((row) => compareIds.includes(row.id)).slice(0, 4);

  const exportRows = rows.map((row) => {
    const r = row as any;
    return {
      name: r.name,
      club: r.club,
      age: r.age,
      marketValue: r.marketValue,
      salary: r.profile?.market?.salary ?? r.salary ?? null,
      ranking: r.profile?.ranking?.world ?? r.ranking ?? null,
      recruitmentScore: r.recruitmentScore,
      recommendationScore: r.recommendationScore,
      compatibility: r.compatibility,
      potential: r.profile?.intelligence?.potential ?? null,
      risk: r.profile?.intelligence?.risk ?? null,
      position: r.profile?.tactical?.primaryPosition ?? r.position ?? null,
      scoreOverall: r.scoreOverall,
    } as any;
  });

  const bestWonderkid =
    rows
      .filter((row) => (row.age ?? 99) <= 21)
      .sort((a, b) => b.recommendationScore - a.recommendationScore)[0]?.name ?? "-";

  const bestReady =
    rows
      .filter((row) => (row.age ?? 0) >= 24)
      .sort((a, b) => b.recommendationScore - a.recommendationScore)[0]?.name ?? "-";

  const bestMarket =
    [...rows].sort(
      (a, b) =>
        b.recommendationScore / Math.max(1, b.marketValue ?? 1) -
        a.recommendationScore / Math.max(1, a.marketValue ?? 1),
    )[0]?.name ?? "-";

  const registerSearch = () => {
    const top = rows[0];
    createObservation({
      entityId: top?.id ?? `${objective}:recommendation-engine`,
      entityKind: objective,
      title: `Recommendation Engine · ${objective === "player" ? "Jogador" : "Treinador"} · ${roleOrPosition || "Sem função"}`,
      description: `Preset ${selectedPreset.name}. ${rows.length} candidatos analisados. Melhor score ${top?.recommendationScore.toFixed(1) ?? "0"}.`,
      type: "recommendation",
      status: "analysis",
      priority: "medium",
      tags: [
        `rec:preset:${selectedPreset.name}`,
        `rec:analyzed:${rows.length}`,
        `rec:best-score:${top?.recommendationScore.toFixed(1) ?? "0"}`,
        `rec:best-wonderkid:${bestWonderkid}`,
        `rec:best-ready:${bestReady}`,
        `rec:best-market:${bestMarket}`,
      ],
    });
  };

  return (
    <RecruitmentLayout
      title="Recommendation Engine"
      subtitle="Motor determinístico que combina Knowledge Base e Recruitment Score para ordenar candidatos."
      breadcrumbs={buildRecruitmentBreadcrumbs("Recommendation Engine")}
      headerActions={
        <>
          <Button variant="outline" onClick={() => exportRecommendationsPDF(exportRows)}>
            <FileSpreadsheet className="size-4" /> PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => exportRecruitmentResultsJSON(exportRows, "recommendations.json")}
          >
            <FileJson className="size-4" /> JSON
          </Button>
          <Button
            variant="outline"
            onClick={() => exportRecruitmentResultsCSV(exportRows, "recommendations.csv")}
          >
            <FileSpreadsheet className="size-4" /> CSV
          </Button>
          <Button variant="outline" onClick={() => exportRecommendationsTXT(exportRows)}>
            <FileText className="size-4" /> TXT
          </Button>
          <Button variant="outline" onClick={registerSearch}>
            <Send className="size-4" /> Registar pesquisa
          </Button>
        </>
      }
      isLoading={engine.isLoading}
    >
      <RecruitmentSection
        title="1. Objetivo"
        description="Selecionar alvo e função/posição de recrutamento."
      >
        <Card>
          <CardContent className="pt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <Label>Objetivo</Label>
              <Tabs
                value={objective}
                onValueChange={(value) => {
                  const next = value as "player" | "coach";
                  setObjective(next);
                  const preset = defaultPreset(next);
                  setPresetId(preset.id);
                  setCriteria(preset.criteria);
                }}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="player">Jogador</TabsTrigger>
                  <TabsTrigger value="coach">Treinador</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-1">
              <Label>{objective === "player" ? "Posição" : "Função"}</Label>
              <Input
                value={roleOrPosition}
                onChange={(e) => setRoleOrPosition(e.target.value)}
                placeholder={objective === "player" ? "Lateral Direito" : "Treinador Principal"}
              />
            </div>
            <div className="space-y-1">
              <Label>Preset</Label>
              <Select
                value={presetId}
                onValueChange={(value) => {
                  setPresetId(value);
                  const preset = availablePresets.find((item) => item.id === value);
                  if (preset) setCriteria(preset.criteria);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availablePresets.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Pesquisa</Label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nome, clube, país..."
              />
            </div>
            <div className="space-y-1">
              <Label>Compatibilidade mínima</Label>
              <Input
                type="number"
                value={minCompatibility}
                onChange={(e) => setMinCompatibility(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label>Perfil tático</Label>
              <Select
                value={tacticalProfileId}
                onValueChange={(value) => setTacticalProfileId(value as typeof tacticalProfileId)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TACTICAL_PRESET_PROFILES.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Ordenação</Label>
              <Button
                variant="outline"
                onClick={() => setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
              >
                <ArrowDownUp className="size-4" /> {sortDir === "asc" ? "ASC" : "DESC"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </RecruitmentSection>

      <RecruitmentSection
        title="2. Critérios e 3. Pesos"
        description="Ativar/desativar e ajustar peso de cada critério."
      >
        <Card>
          <CardContent className="pt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {(Object.keys(criteria) as RecommendationCriterionId[]).map((criterion) => (
              <div key={criterion} className="rounded-md border border-border px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={criteria[criterion].enabled}
                      onCheckedChange={(checked) =>
                        setCriteria((prev) => ({
                          ...prev,
                          [criterion]: { ...prev[criterion], enabled: Boolean(checked) },
                        }))
                      }
                    />
                    {CRITERION_LABELS[criterion]}
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {criteria[criterion].weight}%
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  <Progress
                    value={Math.max(0, Math.min(100, criteria[criterion].weight))}
                    className="h-2"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={criteria[criterion].weight}
                    onChange={(e) =>
                      setCriteria((prev) => ({
                        ...prev,
                        [criterion]: { ...prev[criterion], weight: Number(e.target.value) || 0 },
                      }))
                    }
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </RecruitmentSection>

      <RecruitmentSection
        title="4. Resultados"
        description="Recommendation Score, explain e ações integradas."
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Candidatos ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="overflow-auto">
              <table className="w-full min-w-[1250px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-2">Cmp</th>
                    <th className="p-2">Nome</th>
                    <th className="p-2">Clube</th>
                    <th className="p-2">Idade</th>
                    <th className="p-2">Valor</th>
                    <th className="p-2">Salário</th>
                    <th className="p-2">Ranking</th>
                    <th className="p-2">Recruitment</th>
                    <th className="p-2">Recommendation</th>
                    <th className="p-2">Compatibilidade</th>
                    <th className="p-2">Potencial</th>
                    <th className="p-2">Risco</th>
                    <th className="p-2">Posição</th>
                    <th className="p-2">Score Principal</th>
                    <th className="p-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const checked = compareIds.includes(row.id);
                    const canCheck = checked || compareIds.length < 4;
                    return (
                      <tr key={row.id} className="border-b border-border/40">
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!canCheck}
                            onChange={(e) => {
                              const next = e.target.checked;
                              setCompareIds((prev) => {
                                if (next) return [...new Set([...prev, row.id])].slice(0, 4);
                                return prev.filter((id) => id !== row.id);
                              });
                            }}
                          />
                        </td>
                        <td className="p-2 font-medium">{row.name}</td>
                        <td className="p-2">{row.club ?? "-"}</td>
                        <td className="p-2">{row.age ?? "-"}</td>
                        <td className="p-2">
                          {row.marketValue != null ? fmtMoney(row.marketValue) : "-"}
                        </td>
                        <td className="p-2">
                          {row.profile.market.salary != null
                            ? fmtMoney(row.profile.market.salary)
                            : "-"}
                        </td>
                        <td className="p-2">{row.profile.ranking.world ?? "-"}</td>
                        <td className="p-2">{row.recruitmentScore.toFixed(1)}</td>
                        <td className="p-2 font-semibold">{row.recommendationScore.toFixed(1)}</td>
                        <td className="p-2">{row.compatibility}%</td>
                        <td className="p-2">
                          {row.profile.intelligence.potential != null
                            ? Math.round(row.profile.intelligence.potential)
                            : "-"}
                        </td>
                        <td className="p-2">
                          {row.profile.intelligence.risk != null
                            ? Math.round(row.profile.intelligence.risk)
                            : "-"}
                        </td>
                        <td className="p-2">{row.profile.tactical.primaryPosition ?? "-"}</td>
                        <td className="p-2">{row.scoreOverall.toFixed(1)}</td>
                        <td className="p-2">
                          <div className="flex flex-wrap gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setExplainId(row.id)}
                            >
                              <ShieldQuestion className="size-4" /> Porque?
                            </Button>
                            <RecruitmentPlayerExplainSheet
                              playerName={objective === "player" ? row.name : null}
                              triggerLabel="Explain"
                              triggerVariant="outline"
                              disabled={objective !== "player"}
                              triggerClassName="h-8"
                            />
                            <RecommendationRowActions
                              objective={objective}
                              row={row}
                              presetName={selectedPreset.name}
                              analyzedCount={rows.length}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </RecruitmentSection>

      <RecruitmentSection
        title="Comparação"
        description="Comparação de 2 a 4 candidatos com perfil tático, psicológico e histórico."
      >
        <Card>
          <CardContent className="pt-5">
            {compared.length < 2 ? (
              <p className="text-sm text-muted-foreground">
                Seleciona entre 2 e 4 candidatos na tabela para comparar.
              </p>
            ) : (
              <div className="space-y-3">
                {compared.map((row) => (
                  <div key={row.id} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{row.name}</p>
                      <div className="text-xs text-muted-foreground">
                        Ranking {row.profile.ranking.world ?? "-"} · Recruitment{" "}
                        {row.recruitmentScore.toFixed(1)} · Recommendation{" "}
                        {row.recommendationScore.toFixed(1)} · Compatibilidade {row.compatibility}%
                      </div>
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-3 xl:grid-cols-6 text-xs">
                      <MetricCell label="Estilo" value={row.profile.tactical.style ?? "-"} />
                      <MetricCell
                        label="Radar"
                        value={
                          row.profile.tactical.radar
                            .slice(0, 3)
                            .map((item) => `${item.label}:${Math.round(item.value)}`)
                            .join(" | ") || "-"
                        }
                      />
                      <MetricCell
                        label="Psicológico"
                        value={`${Math.round(avg(row.profile.intelligence.psychological.map((item) => item.score)))}%`}
                      />
                      <MetricCell
                        label="Strengths"
                        value={row.profile.intelligence.strengths.slice(0, 2).join(", ") || "-"}
                      />
                      <MetricCell
                        label="Weaknesses"
                        value={row.profile.intelligence.weaknesses.slice(0, 2).join(", ") || "-"}
                      />
                      <MetricCell
                        label="Timeline"
                        value={String(row.profile.history.timelineIds.length)}
                      />
                      <MetricCell
                        label="Scout Reports"
                        value={String(row.profile.history.reportIds.length)}
                      />
                    </div>
                    <div className="mt-2">
                      <RecruitmentPlayerExplainSheet
                        playerName={objective === "player" ? row.name : null}
                        triggerLabel="Explain"
                        triggerVariant="outline"
                        disabled={objective !== "player"}
                        triggerClassName="h-7 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </RecruitmentSection>

      <Sheet
        open={Boolean(explainRow)}
        onOpenChange={(open) => {
          if (!open) setExplainId(null);
        }}
      >
        <SheetContent className="w-[720px] max-w-[95vw] sm:max-w-[720px]">
          {explainRow ? (
            <>
              <SheetHeader>
                <SheetTitle>
                  Recommendation Score {explainRow.recommendationScore.toFixed(1)}
                </SheetTitle>
                <SheetDescription>
                  {explainRow.name} · {explainRow.club ?? "-"}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contribuições</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {explainRow.recommendationExplain.contributions.map((item) => (
                      <div
                        key={item.criterion}
                        className="rounded-md border border-border px-2.5 py-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span>{item.label}</span>
                          <span>{item.impactPercent}%</span>
                        </div>
                        <Progress value={item.impactPercent} className="h-2 mt-1" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Pontos fortes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {explainRow.recommendationExplain.strengths.map((line, idx) => (
                      <p key={`s-${idx}`}>{line}</p>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Pontos fracos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {explainRow.recommendationExplain.weaknesses.map((line, idx) => (
                      <p key={`w-${idx}`}>{line}</p>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </RecruitmentLayout>
  );
}

function RecommendationRowActions({
  objective,
  row,
  presetName,
  analyzedCount,
}: {
  objective: "player" | "coach";
  row: ReturnType<typeof useRecruitmentRecommendationEngine>["rows"][number];
  presetName: string;
  analyzedCount: number;
}) {
  const { isFavorite, toggle } = useFavorite(objective, row.name);

  return (
    <>
      <Button size="sm" variant="outline" asChild>
        <Link
          to="/recruitment-center/necessidades"
          search={{ originKind: objective, originName: row.name } as never}
        >
          <Send className="size-4" /> Replacement
        </Link>
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          upsertScoutReport({
            title: `Scout Report · ${row.name}`,
            targetId: row.id,
            entityKind: objective,
            entityName: row.name,
            status: "analysis",
            priority: "high",
            summary: row.recommendationExplain.strengths.join(" "),
            tags: ["recommendation-engine", `preset:${presetName}`],
            author: "Recommendation Engine",
          })
        }
      >
        <PlusCircle className="size-4" /> Scout Report
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          createObservation({
            entityId: row.id,
            entityKind: objective,
            title: `Recomendado · ${row.name}`,
            description: `Recommendation Score ${row.recommendationScore.toFixed(1)} com preset ${presetName}.`,
            type: "recommendation",
            status: "priority",
            priority: "high",
            tags: [
              `rec:preset:${presetName}`,
              `rec:analyzed:${analyzedCount}`,
              `rec:best-score:${row.recommendationScore.toFixed(1)}`,
            ],
          })
        }
      >
        <PlusCircle className="size-4" /> Nova Observação
      </Button>
      <Button size="sm" variant={isFavorite ? "default" : "outline"} onClick={toggle}>
        <Heart className={`size-4 ${isFavorite ? "fill-current" : ""}`} /> Favorito
      </Button>
    </>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate">{value}</p>
    </div>
  );
}

function avg(values: Array<number | null | undefined>): number {
  const valid = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  if (!valid.length) return 50;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}
