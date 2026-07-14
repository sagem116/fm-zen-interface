import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityCombobox } from "@/components/EntityCombobox";
import { EvolutionChart } from "@/components/EvolutionChart";
import { StyleRadar } from "@/components/profile/style/StyleRadar";
import { TacticalIndicators } from "@/components/profile/style/TacticalIndicators";
import { TacticalSummary } from "@/components/profile/style/TacticalSummary";
import { StyleTraits } from "@/components/profile/style/StyleTraits";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";
import {
  useRecruitmentIntelligence,
  type RecruitmentIntelligenceKind,
} from "../hooks/useRecruitmentIntelligence";
import { useRecruitmentObservations } from "../hooks/useRecruitmentObservations";
import { RecruitmentLayout } from "./RecruitmentLayout";
import { RecruitmentSection } from "./RecruitmentSection";
import { buildRecruitmentBreadcrumbs } from "../utils/recruitment-breadcrumbs";
import { RecruitmentPlayerExplainSheet } from "./explain/RecruitmentPlayerExplainSheet";

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function toneClass(tone: "up" | "down" | "neutral"): string {
  if (tone === "up") return "text-emerald-600";
  if (tone === "down") return "text-red-600";
  return "text-muted-foreground";
}

const KIND_OPTIONS: Array<{ value: RecruitmentIntelligenceKind; label: string }> = [
  { value: "player", label: "Jogador" },
  { value: "coach", label: "Treinador" },
  { value: "club", label: "Clube" },
  { value: "competition", label: "Competição" },
  { value: "country", label: "País" },
];

export function RecruitmentIntelligencePage() {
  const [kind, setKind] = useState<RecruitmentIntelligenceKind>("player");
  const { source } = useRecruitmentSourceData();
  const { observations } = useRecruitmentObservations();

  const options = useMemo(() => {
    if (!source) return [];
    if (kind === "player") return (source.playerUniverse?.list ?? []).map((item) => item.name);
    if (kind === "coach") return source.entities.coaches.map((item) => item.name);
    if (kind === "club") return source.entities.clubs.map((item) => item.name);
    if (kind === "competition") return source.entities.competitions.map((item) => item.name);
    return source.entities.countries.map((item) => item.name);
  }, [source, kind]);

  const [name, setName] = useState("");

  const selectedName = name || options[0] || "";
  const { isLoading, data } = useRecruitmentIntelligence(kind, selectedName);

  const selectedEntity = useMemo(() => {
    if (!source || !selectedName) return null;
    return (
      source.entities.entities.find(
        (item) => item.type === kind && normalize(item.name) === normalize(selectedName),
      ) ?? null
    );
  }, [source, kind, selectedName]);

  const observationTimeline = useMemo(() => {
    if (!selectedEntity) return [];
    return observations
      .filter(
        (item) => item.entityKind === selectedEntity.type && item.entityId === selectedEntity.id,
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12);
  }, [observations, selectedEntity]);

  return (
    <RecruitmentLayout
      title="Recruitment Intelligence"
      subtitle="Análise técnica, estatística, psicológica e evolutiva determinística sem IA."
      breadcrumbs={buildRecruitmentBreadcrumbs("Recruitment Intelligence")}
      isLoading={isLoading}
      headerActions={
        kind === "player" && selectedName ? (
          <RecruitmentPlayerExplainSheet
            playerName={selectedName}
            triggerLabel="Explain"
            triggerVariant="outline"
          />
        ) : null
      }
    >
      <RecruitmentSection
        title="Perfil Inteligente"
        description="Resumo automático e índices de força/fraqueza."
      >
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de entidade</label>
                <Select
                  value={kind}
                  onValueChange={(value) => setKind(value as RecruitmentIntelligenceKind)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KIND_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Entidade</label>
                <EntityCombobox
                  value={name}
                  onChange={setName}
                  options={options}
                  placeholder="Selecionar entidade"
                />
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {data?.summary ?? "Sem dados suficientes."}
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Strength Index</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(data?.profile?.strengths ?? []).map((item) => (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>{item.label}</span>
                        <span className="tabular-nums">{item.score.toFixed(0)}</span>
                      </div>
                      <Progress value={item.score} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Weakness Index</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(data?.profile?.weaknesses ?? []).map((item) => (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>{item.label}</span>
                        <span className="tabular-nums">{item.score.toFixed(0)}</span>
                      </div>
                      <Progress value={item.score} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </RecruitmentSection>

      {data?.style ? (
        <RecruitmentSection
          title="Perfil Psicológico e Estilo"
          description="Síntese do comportamento tático e mental da entidade."
        >
          <div className="space-y-4">
            <TacticalSummary analysis={data.style} />
            <StyleRadar analysis={data.style} />
            <TacticalIndicators analysis={data.style} />
            <StyleTraits traits={data.style.traits} />
          </div>
        </RecruitmentSection>
      ) : null}

      <RecruitmentSection
        title="Perfil de Desenvolvimento"
        description="Evolução de ranking, score, valor, CA, PA e performance por época."
      >
        <Card>
          <CardContent className="pt-5 space-y-4">
            {data?.development.length ? (
              <>
                <EvolutionChart
                  data={data.development.map((item) => ({
                    year: item.season,
                    weighted: item.score,
                    raw: item.ca,
                    positionWeighted: item.ranking,
                    positionRaw: item.ranking,
                  }))}
                />

                <div className="grid gap-2 md:grid-cols-5">
                  {data.trends.map((item) => (
                    <div
                      key={item.label}
                      className={`rounded-md border border-border px-3 py-2 text-sm ${toneClass(item.tone)}`}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sem série evolutiva suficiente para esta entidade.
              </p>
            )}
          </CardContent>
        </Card>
      </RecruitmentSection>

      <RecruitmentSection
        title="Risco"
        description="Indicadores objetivos para decisão de recrutamento."
      >
        <Card>
          <CardContent className="pt-5 space-y-3">
            {(data?.risks ?? []).map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{item.label}</span>
                  <span className="tabular-nums">{item.value}%</span>
                </div>
                <Progress value={item.value} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </RecruitmentSection>

      <RecruitmentSection
        title="Comparação Inteligente"
        description="Semelhança automática entre jogadores, treinadores e clubes."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <ListCard title="Jogadores semelhantes" items={data?.similar.players ?? []} />
          <ListCard title="Treinadores semelhantes" items={data?.similar.coaches ?? []} />
          <ListCard title="Clubes semelhantes" items={data?.similar.clubs ?? []} />
        </div>
      </RecruitmentSection>

      <RecruitmentSection
        title="Observações Ligadas"
        description="Timeline editorial integrada automaticamente."
      >
        <Card>
          <CardContent className="pt-5">
            {observationTimeline.length ? (
              <div className="space-y-2">
                {observationTimeline.map((item) => (
                  <div key={item.id} className="rounded-md border border-border px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium">{item.title || item.summary}</span>
                      <span className="text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString("pt-PT")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.description || item.summary}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sem observações ligadas para esta entidade.
              </p>
            )}
          </CardContent>
        </Card>
      </RecruitmentSection>
    </RecruitmentLayout>
  );
}

function ListCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ name: string; score: number }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-md border border-border px-2.5 py-2 text-sm"
              >
                <span>{item.name}</span>
                <span className="tabular-nums">{item.score}%</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sem dados para comparação.</p>
        )}
      </CardContent>
    </Card>
  );
}
