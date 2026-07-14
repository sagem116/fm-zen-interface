import { useMemo, useState } from "react";
import { Star, Trash2, ClipboardList, Filter, Search, Activity, Flag } from "lucide-react";
import { EntityCombobox } from "@/components/EntityCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useRecruitmentEntities } from "../hooks/useRecruitmentEntities";
import { useRecruitmentObservations } from "../hooks/useRecruitmentObservations";
import {
  createObservation,
  removeObservation,
  updateObservation,
  type ObservationInput,
} from "../services/recruitment-observations";
import type {
  RecruitmentEntityKind,
  ScoutObservationType,
  ScoutPriority,
  ScoutReportStatus,
} from "../types/recruitment-models";
import {
  exportObservationsPDF,
  exportObservationsTXT,
  exportRecruitmentResultsJSON,
} from "../utils/recruitment-export";
import { buildRecruitmentBreadcrumbs } from "../utils/recruitment-breadcrumbs";
import { PremiumLayout } from "./layout/PremiumLayout";
import { ContentBlock } from "./layout/ContentBlock";
import { NarrativeCard } from "./layout/NarrativeCard";
import { KpiStrip } from "./kpi/KpiStrip";
import { KpiCard } from "./kpi/KpiCard";

const TYPE_OPTIONS: Array<{ value: ScoutObservationType; label: string }> = [
  { value: "observation", label: "Observação" },
  { value: "alert", label: "Alerta" },
  { value: "injury", label: "Lesão" },
  { value: "evolution", label: "Evolução" },
  { value: "highlight", label: "Destaque" },
  { value: "recommendation", label: "Recomendação" },
  { value: "tactical", label: "Nota Tática" },
  { value: "psychological", label: "Nota Psicológica" },
];

const PRIORITY_OPTIONS: Array<{ value: ScoutPriority; label: string }> = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

const STATUS_OPTIONS: Array<{ value: ScoutReportStatus; label: string }> = [
  { value: "new", label: "Novo" },
  { value: "watching", label: "Em observação" },
  { value: "analysis", label: "Em análise" },
  { value: "priority", label: "Prioritário" },
  { value: "sign", label: "Contratar" },
  { value: "archived", label: "Arquivado" },
];

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function RecruitmentObservationsPage() {
  const { entities, competitions, clubs } = useRecruitmentEntities();
  const { observations } = useRecruitmentObservations();

  const [entityKind, setEntityKind] = useState<RecruitmentEntityKind>("player");
  const entityOptions = useMemo(
    () => entities.filter((item) => item.type === entityKind).map((item) => item.name),
    [entities, entityKind],
  );

  const [entityName, setEntityName] = useState("");
  const selectedEntity = useMemo(() => {
    const name = entityName || entityOptions[0] || "";
    return (
      entities.find(
        (item) => item.type === entityKind && normalize(item.name) === normalize(name),
      ) ?? null
    );
  }, [entities, entityKind, entityName, entityOptions]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [season, setSeason] = useState("");
  const [competition, setCompetition] = useState("");
  const [club, setClub] = useState("");
  const [author, setAuthor] = useState("Scout Department");
  const [priority, setPriority] = useState<ScoutPriority>("medium");
  const [status, setStatus] = useState<ScoutReportStatus>("watching");
  const [type, setType] = useState<ScoutObservationType>("observation");
  const [tags, setTags] = useState("");
  const [favorite, setFavorite] = useState(false);

  const [search, setSearch] = useState("");
  const [filterSeason, setFilterSeason] = useState("");
  const [filterCompetition, setFilterCompetition] = useState("");
  const [filterClub, setFilterClub] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(search);
    return observations.filter((item) => {
      if (entityKind && item.entityKind !== entityKind) return false;
      if (selectedEntity && item.entityId !== selectedEntity.id) return false;
      if (q) {
        const bag = [item.title, item.summary, item.description, ...(item.tags ?? [])]
          .map(normalize)
          .join(" ");
        if (!bag.includes(q)) return false;
      }
      if (filterSeason && String(item.season ?? "") !== filterSeason) return false;
      if (filterCompetition && normalize(item.competition) !== normalize(filterCompetition))
        return false;
      if (filterClub && normalize(item.club) !== normalize(filterClub)) return false;
      if (filterPriority && item.priority !== filterPriority) return false;
      if (filterStatus && item.status !== filterStatus) return false;
      return true;
    });
  }, [
    observations,
    search,
    entityKind,
    selectedEntity,
    filterSeason,
    filterCompetition,
    filterClub,
    filterPriority,
    filterStatus,
  ]);

  const submitObservation = () => {
    if (!selectedEntity || !title.trim() || !description.trim()) return;
    const payload: ObservationInput = {
      entityId: selectedEntity.id,
      entityKind: selectedEntity.type,
      title: title.trim(),
      description: description.trim(),
      date,
      season: season ? Number(season) : null,
      competition: competition || null,
      club: club || null,
      author,
      priority,
      status,
      tags: tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      type,
      favorite,
    };
    createObservation(payload);
    setTitle("");
    setDescription("");
  };

  const exportRows = filtered.map((item) => ({
    date: new Date(item.createdAt).toLocaleDateString("pt-PT"),
    entity: `${item.entityKind}:${item.entityId}`,
    type: item.type ?? "observation",
    priority: item.priority ?? "medium",
    status: item.status ?? "watching",
    title: item.title ?? item.summary,
    description: item.description ?? item.summary,
    tags: (item.tags ?? []).join(", "),
  }));

  return (
    <PremiumLayout
      title="Observações"
      description="Diário técnico cronológico com timeline por entidade e filtros editoriais."
      breadcrumbs={buildRecruitmentBreadcrumbs("Observações")}
      lastUpdate={new Date().toISOString().slice(0, 10)}
      analyzedCount={observations.length}
      activeFiltersCount={[search, filterSeason, filterCompetition, filterClub, filterPriority, filterStatus].filter(Boolean).length}
      kpiStrip={
        <KpiStrip>
          <KpiCard
            label="Total Observações"
            value={observations.length}
            icon={ClipboardList}
            intent="default"
          />
          <KpiCard
            label="Prioritárias"
            value={observations.filter(o => o.priority === "high" || o.priority === "urgent").length}
            icon={Flag}
            intent="warning"
          />
          <KpiCard
            label="Em Atividade"
            value={observations.filter(o => o.status === "watching" || o.status === "analysis").length}
            icon={Activity}
            intent="info"
          />
        </KpiStrip>
      }
      headerActions={
        <>
          <Button variant="outline" onClick={() => exportObservationsPDF(exportRows)}>
            PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => exportRecruitmentResultsJSON(exportRows, "observations.json")}
          >
            JSON
          </Button>
          <Button variant="outline" onClick={() => exportObservationsTXT(exportRows)}>
            TXT
          </Button>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
      <ContentBlock
        title="Nova observação"
        description="Registo completo por entidade com metadata editorial."
      >
        <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Entidade</Label>
                <Select
                  value={entityKind}
                  onValueChange={(value) => setEntityKind(value as RecruitmentEntityKind)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="player">Jogador</SelectItem>
                    <SelectItem value="coach">Treinador</SelectItem>
                    <SelectItem value="club">Clube</SelectItem>
                    <SelectItem value="competition">Competição</SelectItem>
                    <SelectItem value="country">País</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Nome</Label>
                <EntityCombobox
                  value={entityName}
                  onChange={setEntityName}
                  options={entityOptions}
                  placeholder="Selecionar entidade"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Título</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título da observação"
                />
              </div>
              <div className="space-y-1">
                <Label>Data</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição técnica"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <FieldSelect
                label="Tipo"
                value={type}
                onValueChange={(v) => setType(v as ScoutObservationType)}
                options={TYPE_OPTIONS}
              />
              <FieldSelect
                label="Prioridade"
                value={priority}
                onValueChange={(v) => setPriority(v as ScoutPriority)}
                options={PRIORITY_OPTIONS}
              />
              <FieldSelect
                label="Estado"
                value={status}
                onValueChange={(v) => setStatus(v as ScoutReportStatus)}
                options={STATUS_OPTIONS}
              />
              <div className="space-y-1">
                <Label>Época</Label>
                <Input
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  placeholder="2032"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <Label>Competição</Label>
                <EntityCombobox
                  value={competition}
                  onChange={setCompetition}
                  options={competitions.map((item) => item.name)}
                  placeholder="Competição"
                />
              </div>
              <div className="space-y-1">
                <Label>Clube</Label>
                <EntityCombobox
                  value={club}
                  onChange={setClub}
                  options={clubs.map((item) => item.name)}
                  placeholder="Clube"
                />
              </div>
              <div className="space-y-1">
                <Label>Autor</Label>
                <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Tags</Label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Wonderkid, Emprestado"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={favorite ? "default" : "outline"}
                onClick={() => setFavorite((v) => !v)}
              >
                <Star className={`size-4 ${favorite ? "fill-current" : ""}`} />
                Favorito
              </Button>
              <Button type="button" onClick={submitObservation}>
                Guardar observação
              </Button>
            </div>
          </div>
      </ContentBlock>

      <ContentBlock
        title="Timeline"
        description="Histórico cronológico pesquisável e filtrável."
      >
          <div className="space-y-4">
            <div className="grid gap-3 grid-cols-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar texto/tags"
              />
              <Input
                value={filterSeason}
                onChange={(e) => setFilterSeason(e.target.value)}
                placeholder="Época"
              />
              <EntityCombobox
                value={filterCompetition}
                onChange={setFilterCompetition}
                options={competitions.map((item) => item.name)}
                placeholder="Competição"
              />
              <EntityCombobox
                value={filterClub}
                onChange={setFilterClub}
                options={clubs.map((item) => item.name)}
                placeholder="Clube"
              />
              <Select
                value={filterPriority || "all"}
                onValueChange={(v) => setFilterPriority(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Prioridade</SelectItem>
                  {PRIORITY_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterStatus || "all"}
                onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Estado</SelectItem>
                  {STATUS_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {filtered.length ? (
                filtered.map((item) => (
                  <div key={item.id} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.title || item.summary}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString("pt-PT")} · {item.entityKind}:
                          {item.entityId}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {item.favorite ? <Badge variant="default">Favorito</Badge> : null}
                        <Badge variant="secondary">{item.type || "observation"}</Badge>
                        <Badge variant="outline">{item.priority || "medium"}</Badge>
                        <Badge variant="outline">{item.status || "watching"}</Badge>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.description || item.summary}
                    </p>
                    {(item.tags ?? []).length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(item.tags ?? []).map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateObservation(item.id, { favorite: !item.favorite })}
                      >
                        <Star className={`size-4 ${item.favorite ? "fill-current" : ""}`} />
                        Importante
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeObservation(item.id)}
                      >
                        <Trash2 className="size-4" />
                        Remover
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sem observações para os filtros atuais.
                </p>
              )}
            </div>
          </div>
      </ContentBlock>
      </div>
    </PremiumLayout>
  );
}

function FieldSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
