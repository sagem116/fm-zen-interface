import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, Download, FileJson, FileText, Save, User } from "lucide-react";
import { EntityCombobox } from "@/components/EntityCombobox";
import { EvolutionChart } from "@/components/EvolutionChart";
import { StyleRadar } from "@/components/profile/style/StyleRadar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useRecruitmentEntities } from "../hooks/useRecruitmentEntities";
import {
  useRecruitmentIntelligence,
  type RecruitmentIntelligenceKind,
} from "../hooks/useRecruitmentIntelligence";
import { useRecruitmentObservations } from "../hooks/useRecruitmentObservations";
import { useRecruitmentReports } from "../hooks/useRecruitmentReports";
import { useRecruitmentTacticalRecruitment } from "../hooks/useRecruitmentTacticalRecruitment";
import {
  upsertScoutReport,
  updateScoutReportStatus,
  type ScoutReportDraft,
} from "../services/recruitment-reports";
import type { ScoutPriority, ScoutReportStatus } from "../types/recruitment-models";
import {
  exportScoutReportJSON,
  exportScoutReportPDF,
  exportScoutReportTXT,
  type ScoutReportExportPayload,
} from "../utils/recruitment-export";
import { buildRecruitmentBreadcrumbs } from "../utils/recruitment-breadcrumbs";
import { PremiumLayout } from "./layout/PremiumLayout";
import { ContentBlock } from "./layout/ContentBlock";
import { NarrativeCard } from "./layout/NarrativeCard";
import { KpiStrip } from "./kpi/KpiStrip";
import { KpiCard } from "./kpi/KpiCard";
import { Target, Activity, ClipboardList } from "lucide-react";
import { RecruitmentPlayerExplainSheet } from "./explain/RecruitmentPlayerExplainSheet";

const STATUS_OPTIONS: Array<{ value: ScoutReportStatus; label: string }> = [
  { value: "new", label: "Novo" },
  { value: "watching", label: "Em observação" },
  { value: "analysis", label: "Em análise" },
  { value: "priority", label: "Prioritário" },
  { value: "sign", label: "Contratar" },
  { value: "archived", label: "Arquivado" },
];

const PRIORITY_OPTIONS: Array<{ value: ScoutPriority; label: string }> = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function kindLabel(kind: RecruitmentIntelligenceKind): string {
  if (kind === "player") return "Jogador";
  if (kind === "coach") return "Treinador";
  if (kind === "club") return "Clube";
  if (kind === "competition") return "Competição";
  return "País";
}

export function RecruitmentScoutReportsPage() {
  const { entities, players, coaches } = useRecruitmentEntities();
  const { observations } = useRecruitmentObservations();
  const { reports } = useRecruitmentReports();

  const [kind, setKind] = useState<RecruitmentIntelligenceKind>("player");
  const options = useMemo(() => {
    if (kind === "player") return players.map((item) => item.name);
    if (kind === "coach") return coaches.map((item) => item.name);
    return entities.filter((item) => item.type === kind).map((item) => item.name);
  }, [kind, players, coaches, entities]);

  const [name, setName] = useState("");
  const selectedName = name || options[0] || "";

  const selectedEntity = useMemo(() => {
    if (!selectedName) return null;
    return (
      entities.find(
        (item) => item.type === kind && normalize(item.name) === normalize(selectedName),
      ) ?? null
    );
  }, [entities, kind, selectedName]);

  const [tagsInput, setTagsInput] = useState("");
  const [notes, setNotes] = useState("");
  const [author, setAuthor] = useState("Scout Department");
  const [status, setStatus] = useState<ScoutReportStatus>("new");
  const [priority, setPriority] = useState<ScoutPriority>("medium");

  const currentReport = useMemo(() => {
    if (!selectedEntity) return null;
    return (
      reports.find(
        (item) => item.targetId === selectedEntity.id && item.entityKind === selectedEntity.type,
      ) ?? null
    );
  }, [reports, selectedEntity]);

  const { data: tactical } = useRecruitmentTacticalRecruitment({
    profileId: "custom",
    customVector: {
      possession: 50,
      buildUp: 50,
      shortPassing: 50,
      longPassing: 50,
      progression: 50,
      pressing: 50,
      recovery: 50,
      counterAttack: 50,
      transitions: 50,
      crossing: 50,
      interiorPlay: 50,
      widePlay: 50,
      finishing: 50,
      creativity: 50,
      defensiveIntensity: 50,
      discipline: 50,
    },
    tab: kind === "coach" ? "coach" : "player",
    query: selectedName,
    minCompatibility: 0,
  });

  const tacticalCandidate = useMemo(() => {
    if (!selectedName || !tactical?.candidates?.length) return null;
    return (
      tactical.candidates.find((item) => normalize(item.name) === normalize(selectedName)) ??
      tactical.candidates[0] ??
      null
    );
  }, [tactical, selectedName]);

  const intelligence = useRecruitmentIntelligence(kind, selectedName);

  const timeline = useMemo(() => {
    if (!selectedEntity) return [];
    return observations
      .filter(
        (item) => item.entityId === selectedEntity.id && item.entityKind === selectedEntity.type,
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [observations, selectedEntity]);

  const profileLink = selectedEntity
    ? selectedEntity.type === "player"
      ? "/jogadores/$name"
      : selectedEntity.type === "coach"
        ? "/treinadores/$name"
        : selectedEntity.type === "club"
          ? "/clubes/$name"
          : selectedEntity.type === "competition"
            ? "/competicoes/$name"
            : "/paises/$name"
    : null;

  const exportPayload: ScoutReportExportPayload = {
    title: currentReport?.title ?? `Scout Report · ${selectedName || "Sem entidade"}`,
    entity: selectedName || "Sem entidade",
    status,
    priority,
    summary: intelligence.data?.summary ?? tacticalCandidate?.summary ?? "",
    tags: tagsInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    compatibility: tacticalCandidate
      ? {
          global: tacticalCandidate.compatibility.global,
          tecnica: tacticalCandidate.compatibility.technical,
          fisica: tacticalCandidate.compatibility.physical,
          mental: tacticalCandidate.compatibility.mental,
          defensiva: tacticalCandidate.compatibility.defensive,
          ofensiva: tacticalCandidate.compatibility.offensive,
        }
      : {},
    timeline: (currentReport?.timeline ?? []).map((item) => ({
      at: item.at,
      message: item.message,
    })),
  };

  const saveReport = () => {
    if (!selectedEntity || !selectedName) return;
    const draft: ScoutReportDraft = {
      title: `Scout Report · ${selectedName}`,
      targetId: selectedEntity.id,
      entityKind: selectedEntity.type,
      entityName: selectedName,
      status,
      priority,
      summary: intelligence.data?.summary ?? tacticalCandidate?.summary,
      notes,
      tags: tagsInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      author,
    };
    upsertScoutReport(draft);
  };

  const updateStatus = (next: ScoutReportStatus) => {
    setStatus(next);
    if (currentReport) updateScoutReportStatus(currentReport.id, next, author);
  };

  return (
    <PremiumLayout
      title="Scout Reports"
      description="Ficha oficial de observação com dados automáticos e metadados editoriais."
      breadcrumbs={buildRecruitmentBreadcrumbs("Scout Reports")}
      lastUpdate={new Date().toISOString().slice(0, 10)}
      analyzedCount={observations.length}
      kpiStrip={
        <KpiStrip>
          <KpiCard
            label="Total Reports"
            value={observations.length}
            icon={FileText}
            intent="default"
          />
          <KpiCard
            label="Destaques"
            value={observations.filter((r: any) => r.type === "highlight").length}
            icon={Target}
            intent="success"
          />
          <KpiCard
            label="Análises Ativas"
            value={observations.filter((r: any) => r.status === "analysis").length}
            icon={Activity}
            intent="info"
          />
        </KpiStrip>
      }
      headerActions={
        <>
          <Button variant="outline" size="sm" onClick={() => exportScoutReportPDF(exportPayload)}>
            <Download className="mr-2 size-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportScoutReportJSON(exportPayload)}>
             JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportScoutReportTXT(exportPayload)}>
             TXT
          </Button>
          <Button onClick={saveReport} size="sm">
            <Save className="mr-2 size-4" /> Guardar
          </Button>
        </>
      }
      rightPanel={
        <div className="space-y-6">
          <ContentBlock title="Estado editorial">
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select
                  value={status}
                  onValueChange={(value) => updateStatus(value as ScoutReportStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Prioridade</Label>
                <Select
                  value={priority}
                  onValueChange={(value) => setPriority(value as ScoutPriority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tags</Label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Wonderkid, Mercado Nacional"
                />
              </div>
              <div className="space-y-1">
                <Label>Autor</Label>
                <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
              </div>
            </div>
          </ContentBlock>

          <ContentBlock title="Histórico do Relatório">
              {(currentReport?.timeline ?? []).length ? (
                <div className="space-y-2">
                  {(currentReport?.timeline ?? []).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-md border border-border px-2.5 py-2 text-xs bg-muted/20"
                    >
                      <p className="font-medium">{new Date(item.at).toLocaleString("pt-PT")}</p>
                      <p className="text-muted-foreground mt-1 leading-relaxed">{item.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem histórico editorial.</p>
              )}
          </ContentBlock>
        </div>
      }
    >
      <ContentBlock
        title="Scout Report"
        description="Relatório completo por jogador ou treinador."
      >
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Tipo de entidade</Label>
                <Select
                  value={kind}
                  onValueChange={(value) => setKind(value as RecruitmentIntelligenceKind)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="player">Jogador</SelectItem>
                    <SelectItem value="coach">Treinador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Entidade</Label>
                <EntityCombobox
                  value={name}
                  onChange={setName}
                  options={options}
                  placeholder="Selecionar entidade"
                />
              </div>
            </div>

            {selectedEntity ? (
              <div className="grid gap-4 lg:grid-cols-[120px_1fr]">
                <div className="flex h-[120px] items-center justify-center rounded-xl border border-border bg-muted/30">
                  <User className="size-10 text-muted-foreground" />
                </div>
                <div className="grid gap-2 md:grid-cols-3 text-sm">
                  <Info label="Nome" value={selectedEntity.name} />
                  <Info label="Tipo" value={kindLabel(kind)} />
                  <Info label="Clube" value={selectedEntity.club ?? "-"} />
                  <Info label="País" value={selectedEntity.country ?? "-"} />
                  <Info label="Competição" value={selectedEntity.competition ?? "-"} />
                  <Info
                    label="Ranking"
                    value={selectedEntity.ranking != null ? String(selectedEntity.ranking) : "-"}
                  />
                  <Info
                    label="Score"
                    value={
                      selectedEntity.score != null ? String(Math.round(selectedEntity.score)) : "-"
                    }
                  />
                  <Info
                    label="Valor"
                    value={
                      selectedEntity.metadata?.marketValue != null
                        ? String(selectedEntity.metadata.marketValue)
                        : "-"
                    }
                  />
                  <Info
                    label="Salário"
                    value={
                      selectedEntity.metadata?.salary != null
                        ? String(selectedEntity.metadata.salary)
                        : "-"
                    }
                  />
                </div>
              </div>
            ) : null}

            {selectedEntity?.type === "player" ? (
              <RecruitmentPlayerExplainSheet
                playerName={selectedEntity.name}
                triggerLabel="Explain"
                triggerVariant="outline"
              />
            ) : null}

            <div className="space-y-1">
              <Label>Notas editoriais</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Análise editorial adicional"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigator.clipboard.writeText(intelligence.data?.summary ?? "")}
              >
                <Copy className="size-4" /> Copiar resumo
              </Button>
              {profileLink && selectedEntity ? (
                <Button variant="outline" asChild>
                  <Link to={profileLink as never} params={{ name: selectedEntity.name } as never}>
                    Abrir Perfil
                  </Link>
                </Button>
              ) : null}
            </div>
        </div>
      </ContentBlock>

      <ContentBlock
        title="Compatibilidade"
        description="Reutilização direta do Tactical Recruitment."
      >
        {tacticalCandidate ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                {[
                  ["Compatibilidade Global", tacticalCandidate.compatibility.global],
                  ["Técnica", tacticalCandidate.compatibility.technical],
                  ["Física", tacticalCandidate.compatibility.physical],
                  ["Mental", tacticalCandidate.compatibility.mental],
                  ["Defensiva", tacticalCandidate.compatibility.defensive],
                  ["Ofensiva", tacticalCandidate.compatibility.offensive],
                ].map(([label, value]) => (
                  <div key={String(label)} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>{label}</span>
                      <span className="tabular-nums">{value}%</span>
                    </div>
                    <Progress value={Number(value)} className="h-2" />
                  </div>
                ))}
              </div>
            </div>
            <StyleRadar
              analysis={{
                entity: tacticalCandidate.name,
                season: 0,
                sampleSize: 0,
                vector: tacticalCandidate.vector,
                strengths: tacticalCandidate.strengths,
                weaknesses: tacticalCandidate.weaknesses,
                offensive: [],
                defensive: [],
                build: [],
                traits: tacticalCandidate.styleIndicators.map((item) => item.label),
                summary: tacticalCandidate.summary,
              }}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sem compatibilidade disponível.</p>
        )}
      </ContentBlock>

      <ContentBlock
        title="Perfil Inteligente"
        description="Reutilização da Recruitment Intelligence."
      >
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {intelligence.data?.summary ?? "Sem resumo inteligente."}
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium mb-2">Pontos fortes</p>
                <div className="space-y-1">
                  {(intelligence.data?.profile?.strengths ?? []).map((item) => (
                    <Badge key={item.id} variant="secondary" className="mr-1 mb-1">
                      {item.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Pontos fracos</p>
                <div className="space-y-1">
                  {(intelligence.data?.profile?.weaknesses ?? []).map((item) => (
                    <Badge key={item.id} variant="outline" className="mr-1 mb-1">
                      {item.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {intelligence.data?.development.length ? (
              <EvolutionChart
                data={intelligence.data.development.map((item) => ({
                  year: item.season,
                  weighted: item.score,
                  raw: item.ca,
                  positionWeighted: item.ranking,
                  positionRaw: item.ranking,
                }))}
              />
            ) : null}
        </div>
      </ContentBlock>

      <ContentBlock
        title="Perfil Psicológico"
        description="Indicadores editoriais por traços e consistência."
      >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              "Liderança",
              "Ambição",
              "Pressão",
              "Temperamento",
              "Profissionalismo",
              "Consistência",
              "Versatilidade",
            ].map((label) => {
              const trait = intelligence.data?.profile?.traits.find((item) =>
                normalize(item.label).includes(normalize(label)),
              );
              const value = trait?.score ?? 50;
              return (
                <div key={label} className="space-y-1 rounded-md border border-border p-3 bg-muted/20">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium text-foreground">{label}</span>
                    <span className="tabular-nums font-bold">{Math.round(value)}%</span>
                  </div>
                  <Progress value={value} className="h-2" />
                </div>
              );
            })}
          </div>
      </ContentBlock>

      <ContentBlock
        title="Timeline de Observações"
        description="Histórico integrado da entidade no Recruitment."
      >
            {timeline.length ? (
              <div className="space-y-2">
                {timeline.map((item) => (
                  <div key={item.id} className="rounded-md border border-border px-3 py-2 text-sm bg-muted/20">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-medium leading-none">{item.title || item.summary}</p>
                      <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString("pt-PT")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      {item.description || item.summary}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sem observações registadas para esta entidade.
              </p>
            )}
      </ContentBlock>
    </PremiumLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border px-2.5 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}
