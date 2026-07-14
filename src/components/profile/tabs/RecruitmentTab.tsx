import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, Download, FileJson, FileText, Heart, Save } from "lucide-react";
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
import { useRecruitmentEntities } from "@/features/recruitment";
import { useRecruitmentIntelligence } from "@/features/recruitment";
import { useRecruitmentKnowledgeProfile } from "@/features/recruitment";
import { useRecruitmentObservations } from "@/features/recruitment";
import { useRecruitmentReports } from "@/features/recruitment";
import { useRecruitmentTacticalRecruitment } from "@/features/recruitment";
import { createObservation, removeObservation, updateObservation } from "@/features/recruitment";
import {
  upsertScoutReport,
  updateScoutReportStatus,
  type ScoutReportDraft,
} from "@/features/recruitment";
import {
  exportObservationsPDF,
  exportRecruitmentResultsJSON,
  exportScoutReportJSON,
  exportScoutReportPDF,
  exportScoutReportTXT,
  type ScoutReportExportPayload,
} from "@/features/recruitment";
import type {
  RecruitmentEntityKind,
  ScoutObservation,
  ScoutPriority,
  ScoutReportStatus,
} from "@/features/recruitment";
import type { ProfileContext } from "@/lib/profile/types";

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

function toRecruitmentKind(kind: ProfileContext["kind"]): RecruitmentEntityKind {
  if (kind === "competition") return "competition";
  if (kind === "country") return "country";
  return kind;
}

function profileRoute(kind: RecruitmentEntityKind): string {
  if (kind === "player") return "/jogadores/$name";
  if (kind === "coach") return "/treinadores/$name";
  if (kind === "club") return "/clubes/$name";
  if (kind === "competition") return "/competicoes/$name";
  return "/paises/$name";
}

export function RecruitmentTab({ ctx }: { ctx: ProfileContext }) {
  const recruitmentKind = toRecruitmentKind(ctx.kind);
  const { entities } = useRecruitmentEntities();
  const { observations } = useRecruitmentObservations();
  const { reports } = useRecruitmentReports();

  const selectedEntity = useMemo(() => {
    return (
      entities.find(
        (item) => item.type === recruitmentKind && normalize(item.name) === normalize(ctx.name),
      ) ?? null
    );
  }, [entities, recruitmentKind, ctx.name]);

  const [status, setStatus] = useState<ScoutReportStatus>("new");
  const [priority, setPriority] = useState<ScoutPriority>("medium");
  const [author, setAuthor] = useState("Scout Department");
  const [tagsInput, setTagsInput] = useState("");
  const [notes, setNotes] = useState("");

  const currentReport = useMemo(() => {
    if (!selectedEntity) return null;
    return (
      reports.find(
        (item) => item.targetId === selectedEntity.id && item.entityKind === selectedEntity.type,
      ) ?? null
    );
  }, [reports, selectedEntity]);

  const timeline = useMemo(() => {
    if (!selectedEntity) return [] as ScoutObservation[];
    return observations
      .filter(
        (item) => item.entityId === selectedEntity.id && item.entityKind === selectedEntity.type,
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [observations, selectedEntity]);

  const latestObservations = timeline.slice(0, 5);

  const recommendationHistory = useMemo(() => {
    if (!selectedEntity) {
      return {
        count: 0,
        presets: [] as string[],
        bestScore: null as number | null,
        lastRecommendationAt: null as string | null,
        lastReportTitle: null as string | null,
      };
    }

    const rec = observations
      .filter(
        (item) =>
          item.entityId === selectedEntity.id &&
          item.entityKind === selectedEntity.type &&
          item.type === "recommendation",
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const presets = [
      ...new Set(
        rec
          .map((item) => (item.tags ?? []).find((tag) => tag.startsWith("rec:preset:")) ?? "")
          .filter(Boolean)
          .map((tag) => tag.replace("rec:preset:", "")),
      ),
    ];

    const bestScore = rec.reduce<number | null>((best, item) => {
      const raw = (item.tags ?? []).find((tag) => tag.startsWith("rec:best-score:"));
      const n = Number(raw?.replace("rec:best-score:", "") ?? NaN);
      if (!Number.isFinite(n)) return best;
      if (best == null) return n;
      return Math.max(best, n);
    }, null);

    const lastReport =
      reports
        .filter(
          (item) => item.targetId === selectedEntity.id && item.entityKind === selectedEntity.type,
        )
        .sort(
          (a, b) =>
            new Date(b.updatedAt ?? b.createdAt).getTime() -
            new Date(a.updatedAt ?? a.createdAt).getTime(),
        )[0] ?? null;

    return {
      count: rec.length,
      presets,
      bestScore,
      lastRecommendationAt: rec[0]?.createdAt ?? null,
      lastReportTitle: lastReport?.title ?? null,
    };
  }, [selectedEntity, observations, reports]);

  const [obsTitle, setObsTitle] = useState("");
  const [obsText, setObsText] = useState("");

  const tactical = useRecruitmentTacticalRecruitment({
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
    tab: recruitmentKind === "coach" ? "coach" : "player",
    query: ctx.name,
    minCompatibility: 0,
  });

  const tacticalCandidate = useMemo(() => {
    if (recruitmentKind !== "player" && recruitmentKind !== "coach") return null;
    return (
      tactical.data?.candidates.find((item) => normalize(item.name) === normalize(ctx.name)) ?? null
    );
  }, [tactical.data, recruitmentKind, ctx.name]);

  const intelligence = useRecruitmentIntelligence(ctx.kind, ctx.name);
  const knowledge = useRecruitmentKnowledgeProfile(recruitmentKind, ctx.name);

  const saveReport = () => {
    if (!selectedEntity) return;
    const draft: ScoutReportDraft = {
      title: `Scout Report · ${ctx.name}`,
      targetId: selectedEntity.id,
      entityKind: selectedEntity.type,
      entityName: selectedEntity.name,
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

  const createObs = () => {
    if (!selectedEntity || !obsTitle.trim() || !obsText.trim()) return;
    createObservation({
      entityId: selectedEntity.id,
      entityKind: selectedEntity.type,
      title: obsTitle.trim(),
      description: obsText.trim(),
      author,
      priority,
      status,
      tags: tagsInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      type: "observation",
    });
    setObsTitle("");
    setObsText("");
  };

  const exportPayload: ScoutReportExportPayload = {
    title: currentReport?.title ?? `Scout Report · ${ctx.name}`,
    entity: ctx.name,
    status,
    priority,
    summary: intelligence.data?.summary ?? tacticalCandidate?.summary,
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

  const exportObservationRows = timeline.map((item) => ({
    date: new Date(item.createdAt).toLocaleDateString("pt-PT"),
    entity: `${item.entityKind}:${item.entityId}`,
    type: item.type ?? "observation",
    priority: item.priority ?? "medium",
    status: item.status ?? "watching",
    title: item.title ?? item.summary,
    description: item.description ?? item.summary,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recruitment Knowledge Base</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Recruitment Score</p>
            <Badge variant="secondary" className="text-sm">
              {knowledge.data ? knowledge.data.recruitmentScore.toFixed(1) : "-"}
            </Badge>
          </div>
          {knowledge.data ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4 text-sm">
              <InfoCell
                label="Ranking"
                value={
                  knowledge.data.profile.ranking.world != null
                    ? String(knowledge.data.profile.ranking.world)
                    : "-"
                }
              />
              <InfoCell
                label="Compatibilidade"
                value={
                  knowledge.data.profile.tactical.compatibilityGlobal != null
                    ? `${knowledge.data.profile.tactical.compatibilityGlobal}%`
                    : "-"
                }
              />
              <InfoCell
                label="Potencial"
                value={
                  knowledge.data.profile.intelligence.potential != null
                    ? `${Math.round(knowledge.data.profile.intelligence.potential)}%`
                    : "-"
                }
              />
              <InfoCell
                label="Risco"
                value={
                  knowledge.data.profile.intelligence.risk != null
                    ? `${Math.round(knowledge.data.profile.intelligence.risk)}%`
                    : "-"
                }
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">A construir Recruitment Profile...</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recommendation History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5 text-sm">
            <InfoCell label="Vezes recomendado" value={String(recommendationHistory.count)} />
            <InfoCell
              label="Presets"
              value={
                recommendationHistory.presets.length
                  ? recommendationHistory.presets.join(", ")
                  : "-"
              }
            />
            <InfoCell
              label="Melhor Recommendation Score"
              value={
                recommendationHistory.bestScore != null
                  ? recommendationHistory.bestScore.toFixed(1)
                  : "-"
              }
            />
            <InfoCell
              label="Última recomendação"
              value={
                recommendationHistory.lastRecommendationAt
                  ? new Date(recommendationHistory.lastRecommendationAt).toLocaleDateString("pt-PT")
                  : "-"
              }
            />
            <InfoCell
              label="Último Scout Report"
              value={recommendationHistory.lastReportTitle ?? "-"}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scout Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select
                value={status}
                onValueChange={(value) => {
                  const next = value as ScoutReportStatus;
                  setStatus(next);
                  if (currentReport) updateScoutReportStatus(currentReport.id, next, author);
                }}
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
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Tags</Label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Wonderkid, Substituto"
              />
            </div>
            <div className="space-y-1">
              <Label>Autor</Label>
              <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas editoriais"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={saveReport}>
              <Save className="size-4" /> Guardar relatório
            </Button>
            <Button variant="outline" onClick={() => exportScoutReportPDF(exportPayload)}>
              <Download className="size-4" /> Exportar Scout Report
            </Button>
            <Button variant="outline" onClick={() => exportScoutReportJSON(exportPayload)}>
              <FileJson className="size-4" /> JSON
            </Button>
            <Button variant="outline" onClick={() => exportScoutReportTXT(exportPayload)}>
              <FileText className="size-4" /> TXT
            </Button>
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(intelligence.data?.summary ?? "")}
            >
              <Copy className="size-4" /> Copiar resumo
            </Button>
            <Button variant="outline" asChild>
              <Link
                to={
                  recruitmentKind === "player" || recruitmentKind === "coach"
                    ? "/recruitment-center/necessidades"
                    : "/recruitment-center"
                }
                search={{ originKind: recruitmentKind, originName: ctx.name } as never}
              >
                Abrir Replacement Center
              </Link>
            </Button>
          </div>

          {currentReport?.timeline?.length ? (
            <div className="space-y-1">
              <Label>Histórico do relatório</Label>
              <div className="space-y-2">
                {currentReport.timeline.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-border px-2.5 py-2 text-xs"
                  >
                    <p className="font-medium">{new Date(item.at).toLocaleDateString("pt-PT")}</p>
                    <p className="text-muted-foreground">{item.message}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <Input
              value={obsTitle}
              onChange={(e) => setObsTitle(e.target.value)}
              placeholder="Título"
            />
            <Input
              value={obsText}
              onChange={(e) => setObsText(e.target.value)}
              placeholder="Nova observação"
            />
            <Button onClick={createObs}>Nova observação</Button>
          </div>

          {latestObservations.length ? (
            <div className="space-y-2">
              {latestObservations.map((item) => (
                <div key={item.id} className="rounded-md border border-border p-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{item.title || item.summary}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {new Date(item.createdAt).toLocaleString("pt-PT")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline">{item.status || "watching"}</Badge>
                      <Badge variant="secondary">{item.priority || "medium"}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.description || item.summary}
                  </p>
                  {(item.competition || item.club) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {item.club ? (
                        <Link
                          to="/clubes/$name"
                          params={{ name: item.club }}
                          className="hover:text-primary"
                          search={{ tab: undefined }}
                        >
                          {item.club}
                        </Link>
                      ) : null}
                      {item.competition ? (
                        <Link
                          to="/competicoes/$name"
                          params={{ name: item.competition }}
                          className="hover:text-primary"
                          search={{ tab: undefined }}
                        >
                          {item.competition}
                        </Link>
                      ) : null}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={item.favorite ? "default" : "outline"}
                      onClick={() => updateObservation(item.id, { favorite: !item.favorite })}
                    >
                      <Heart className={`size-4 ${item.favorite ? "fill-current" : ""}`} /> Favorita
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateObservation(item.id, {
                          description: `${item.description || item.summary} (editado)`,
                        })
                      }
                    >
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => removeObservation(item.id)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem observações registadas.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportObservationsPDF(exportObservationRows)}>
              Exportar Observações
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                exportRecruitmentResultsJSON(exportObservationRows, `${ctx.name}-observacoes.json`)
              }
            >
              JSON
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recruitment Intelligence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {intelligence.data?.summary ?? "Sem resumo disponível."}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium mb-2">Strengths</p>
              {(intelligence.data?.profile?.strengths ?? []).map((item) => (
                <Badge key={item.id} variant="secondary" className="mr-1 mb-1">
                  {item.label}
                </Badge>
              ))}
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Weaknesses</p>
              {(intelligence.data?.profile?.weaknesses ?? []).map((item) => (
                <Badge key={item.id} variant="outline" className="mr-1 mb-1">
                  {item.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            {(intelligence.data?.trends ?? []).map((item) => (
              <div key={item.label} className="rounded-md border border-border px-2.5 py-2 text-sm">
                {item.label}
              </div>
            ))}
          </div>

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
                <div key={label} className="space-y-1 rounded-md border border-border px-2.5 py-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>{label}</span>
                    <span className="tabular-nums">{Math.round(value)}%</span>
                  </div>
                  <Progress value={value} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {(ctx.kind === "player" || ctx.kind === "coach") && tacticalCandidate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tactical Recruitment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ["Compatibilidade", tacticalCandidate.compatibility.global],
                ["Ofensiva", tacticalCandidate.compatibility.offensive],
                ["Defensiva", tacticalCandidate.compatibility.defensive],
              ].map(([label, value]) => (
                <div key={String(label)} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{label}</span>
                    <span>{value}%</span>
                  </div>
                  <Progress value={Number(value)} className="h-2" />
                </div>
              ))}
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
          </CardContent>
        </Card>
      ) : null}

      {(ctx.kind === "club" || ctx.kind === "competition" || ctx.kind === "country") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length ? (
              <div className="space-y-2">
                {timeline.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-border px-2.5 py-2 text-sm"
                  >
                    <p className="font-medium">{item.title || item.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("pt-PT")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem entradas na timeline.</p>
            )}
          </CardContent>
        </Card>
      )}

      {ctx.kind === "club" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observados</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <ObservedList
              title="Jogadores observados"
              items={observations.filter(
                (item) =>
                  item.entityKind === "player" && normalize(item.club) === normalize(ctx.name),
              )}
            />
            <ObservedList
              title="Treinadores observados"
              items={observations.filter(
                (item) =>
                  item.entityKind === "coach" && normalize(item.club) === normalize(ctx.name),
              )}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border px-2.5 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function ObservedList({ title, items }: { title: string; items: ScoutObservation[] }) {
  return (
    <div>
      <p className="text-sm font-medium mb-2">{title}</p>
      {items.length ? (
        <div className="space-y-1.5">
          {items.slice(0, 8).map((item) => (
            <Link
              key={item.id}
              to={profileRoute(item.entityKind) as never}
              params={
                {
                  name: item.entityId.replace(/^(player|coach|club|competition|country):/, ""),
                } as never
              }
              className="block rounded-md border border-border px-2 py-1.5 text-sm hover:text-primary"
            >
              {item.title || item.summary}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sem registos.</p>
      )}
    </div>
  );
}
