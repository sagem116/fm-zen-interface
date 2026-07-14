import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  BookmarkPlus,
  Copy,
  Download,
  Eye,
  FileJson,
  FileSpreadsheet,
  FileText,
  Filter,
  GitCompare,
  PanelRight,
  PanelRightClose,
  ChevronRight,
  Heart,
  Search,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFavorite } from "@/lib/profile/favorites";
import { fmtMoney } from "@/lib/fmt";
import { RecruitmentPlaceholder } from "./RecruitmentPlaceholder";
import { RecruitmentSection } from "./RecruitmentSection";
import { PremiumLayout } from "./layout/PremiumLayout";
import { ContentBlock } from "./layout/ContentBlock";
import { KpiStrip } from "./kpi/KpiStrip";
import { KpiCard } from "./kpi/KpiCard";
import { RecruitmentPlayerExplainSheet } from "./explain/RecruitmentPlayerExplainSheet";
import { buildRecruitmentBreadcrumbs } from "../utils/recruitment-breadcrumbs";
import {
  useRecruitmentScoutSearch,
  type RecruitmentScoutFilters,
} from "../hooks/useRecruitmentScoutSearch";
import { useRecruitmentSavedSearches } from "../hooks/useRecruitmentSavedSearches";
import type { RecruitmentEntity, RecruitmentPlayer } from "../types/recruitment-models";
import {
  exportRecruitmentResultsCSV,
  exportRecruitmentResultsExcel,
  exportRecruitmentResultsJSON,
} from "../utils/recruitment-export";

const ALL = "__all__";

type SortKey =
  | "name"
  | "ranking"
  | "currentScore"
  | "potentialScore"
  | "marketValue"
  | "age"
  | "club"
  | "country";

type SortDir = "asc" | "desc";

type ColumnKey =
  | "name"
  | "club"
  | "country"
  | "competition"
  | "age"
  | "marketValue"
  | "currentScore"
  | "potentialScore"
  | "ranking"
  | "idu"
  | "personality";

const DEFAULT_COLUMNS: ColumnKey[] = [
  "name",
  "club",
  "country",
  "age",
  "marketValue",
  "currentScore",
  "potentialScore",
  "ranking",
];

const COLUMN_LABELS: Record<ColumnKey, string> = {
  name: "Nome",
  club: "Clube",
  country: "País",
  competition: "Competição",
  age: "Idade",
  marketValue: "Valor",
  currentScore: "Score A",
  potentialScore: "Score P",
  ranking: "Ranking",
  idu: "IDU",
  personality: "Personalidade",
};

const FILTER_DEFAULTS: RecruitmentScoutFilters = {
  query: "",
  tab: "player",
  club: "",
  country: "",
  competition: "",
  nationality: "",
  continent: "",
  season: null,
  minAge: null,
  maxAge: null,
  minMarketValue: null,
  maxMarketValue: null,
  personality: "",
  roleOrPosition: "",
  idu: "",
  rankingMin: null,
  rankingMax: null,
};

function parseNum(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asText(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function compareValues(a: unknown, b: unknown, dir: SortDir): number {
  const sign = dir === "asc" ? 1 : -1;
  const an = typeof a === "number" ? a : Number.NaN;
  const bn = typeof b === "number" ? b : Number.NaN;
  if (Number.isFinite(an) && Number.isFinite(bn)) {
    return (an - bn) * sign;
  }
  return asText(a).localeCompare(asText(b), "pt-PT", { sensitivity: "base" }) * sign;
}

function currentScoreOf(row: RecruitmentEntity): number {
  return Number(row.score ?? 0);
}

function potentialScoreOf(row: RecruitmentEntity): number {
  const player = row as RecruitmentPlayer;
  return Number(player.pa ?? row.score ?? 0);
}

export function RecruitmentScoutSearchPage() {
  const [filters, setFilters] = useState<RecruitmentScoutFilters>(FILTER_DEFAULTS);
  const [sortBy, setSortBy] = useState<SortKey>("ranking");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_COLUMNS);
  const [showFilters, setShowFilters] = useState(true);
  const [showDetail, setShowDetail] = useState(true);

  const { source, results, isLoading } = useRecruitmentScoutSearch(filters);
  const { searches, favorites, recent, saveSearch, toggleFavorite } = useRecruitmentSavedSearches();

  const sorted = useMemo(() => {
    const rows = [...results];
    rows.sort((a, b) => {
      const am = (a.metadata ?? {}) as Record<string, unknown>;
      const bm = (b.metadata ?? {}) as Record<string, unknown>;
      switch (sortBy) {
        case "name":
          return compareValues(a.name, b.name, sortDir);
        case "club":
          return compareValues(a.club, b.club, sortDir);
        case "country":
          return compareValues(a.country, b.country, sortDir);
        case "ranking":
          return compareValues(a.ranking ?? 0, b.ranking ?? 0, sortDir);
        case "currentScore":
          return compareValues(currentScoreOf(a), currentScoreOf(b), sortDir);
        case "potentialScore":
          return compareValues(potentialScoreOf(a), potentialScoreOf(b), sortDir);
        case "marketValue":
          return compareValues(
            (a as { marketValue?: number }).marketValue ?? am.marketValue ?? 0,
            (b as { marketValue?: number }).marketValue ?? bm.marketValue ?? 0,
            sortDir,
          );
        case "age":
          return compareValues(
            (a as { age?: number }).age ?? am.age ?? 0,
            (b as { age?: number }).age ?? bm.age ?? 0,
            sortDir,
          );
        default:
          return 0;
      }
    });
    return rows;
  }, [results, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const selected = useMemo(() => {
    if (!selectedId) return paged[0] ?? null;
    return sorted.find((row) => row.id === selectedId) ?? null;
  }, [sorted, paged, selectedId]);

  const clubs = useMemo(() => {
    if (!source?.playerUniverse) return [];
    return [
      ...new Set(
        source.playerUniverse.list
          .map((e) => e.currentClub)
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
      ),
    ].sort((a, b) => a.localeCompare(b, "pt-PT"));
  }, [source]);

  const countries = useMemo(() => {
    if (!source?.playerUniverse) return [];
    return [
      ...new Set(
        source.playerUniverse.list
          .map((e) => e.country)
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
      ),
    ].sort((a, b) => a.localeCompare(b, "pt-PT"));
  }, [source]);

  const competitions = useMemo(() => {
    if (!source?.playerUniverse) return [];
    return [
      ...new Set(
        source.playerUniverse.list
          .map((e) => {
            // attempt to read competition from extras if present
            const extras = (e.extras as Record<string, unknown> | null) ?? {};
            const comp = (extras["competition"] as string | undefined) ?? (extras["league"] as string | undefined);
            return comp ?? null;
          })
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
      ),
    ].sort((a, b) => a.localeCompare(b, "pt-PT"));
  }, [source]);

  const personalities = useMemo(() => {
    if (!source?.playerUniverse) return [];
    const pool = source.playerUniverse.list
      .map((e) => asText((e.extras ?? {})["personality"]))
      .filter(Boolean);
    return [...new Set(pool)].sort((a, b) => a.localeCompare(b, "pt-PT"));
  }, [source]);

  const seasons = source?.playerUniverse.list
    .map((e) => e.seasonYear)
    .filter((v): v is number => typeof v === "number")
    .sort((a, b) => b - a) ?? [];

  const scoreDefs = source?.catalogs.scores ?? [];
  const dictionary = source?.catalogs.dictionary;

  const rowsForExport = useMemo(() => {
    return sorted.map((row) => {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      return {
        id: row.id,
        nome: row.name,
        entidade: row.type,
        clube: row.club,
        pais: row.country,
        competicao: row.competition,
        idade: (row as { age?: number }).age ?? meta.age ?? null,
        valorMercado: (row as { marketValue?: number }).marketValue ?? meta.marketValue ?? null,
        scoreAtual: currentScoreOf(row),
        scorePotencial: potentialScoreOf(row),
        ranking: row.ranking,
        idu: meta.idu ?? null,
        personalidade: meta.personality ?? null,
      };
    });
  }, [sorted]);

  const selectedName = selected?.name ?? "";
  const isFav = useFavorite(filters.tab, selectedName);

  const saveCurrentSearch = () => {
    saveSearch({
      name: `${filters.tab === "player" ? "Jogadores" : "Treinadores"} · ${filters.query || "Sem termo"}`,
      filters,
      columns: visibleColumns,
      sortBy,
      sortDir,
      favorite: false,
    });
  };

  const detailGridClass = showDetail ? "xl:grid-cols-[minmax(0,1fr)_340px]" : "xl:grid-cols-1";





  return (
    <PremiumLayout
      title="Scout Search"
      description="Pesquisa inteligente com filtros dinâmicos do Dictionary e Scores Studio."
      breadcrumbs={buildRecruitmentBreadcrumbs("Pesquisa")}
      analyzedCount={sorted.length}
      activeFiltersCount={[filters.query, filters.club, filters.competition, filters.country, filters.personality].filter(Boolean).length}
      kpiStrip={
        <KpiStrip>
          <KpiCard
            label="Resultados"
            value={sorted.length}
            icon={Users}
            intent="default"
          />
          <KpiCard
            label="Pesquisas Guardadas"
            value={searches.length}
            icon={BookmarkPlus}
            intent="info"
          />
          <KpiCard
            label="Favoritas"
            value={favorites.length}
            icon={Star}
            intent="success"
          />
          <KpiCard
            label="Dictionary Dinâmico"
            value={dictionary?.entries.length ?? 0}
            icon={Eye}
            intent="default"
          />
        </KpiStrip>
      }
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
            <Button
              variant={showFilters ? "secondary" : "ghost"}
              size="sm"
              className="h-8"
              onClick={() => setShowFilters((v) => !v)}
            >
              <Filter className="mr-2 size-4" />
              Filtros
            </Button>
            <Button
              variant={showDetail ? "secondary" : "ghost"}
              size="sm"
              className="h-8"
              onClick={() => setShowDetail((v) => !v)}
            >
              <PanelRight className="mr-2 size-4" />
              Detalhe
            </Button>
          </div>
          <Button variant="outline" size="sm" className="h-9" onClick={saveCurrentSearch}>
            <BookmarkPlus className="mr-2 size-4" />
            Guardar pesquisa
          </Button>
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
            <span className="pl-2 pr-1 text-xs font-medium text-muted-foreground">Exportar</span>
            <Button variant="ghost" size="sm" className="h-8" onClick={() => exportRecruitmentResultsCSV(rowsForExport)}>
              <FileText className="mr-1.5 size-4" />
              CSV
            </Button>
            <Button variant="ghost" size="sm" className="h-8" onClick={() => exportRecruitmentResultsExcel(rowsForExport)}>
              <FileSpreadsheet className="mr-1.5 size-4" />
              Excel
            </Button>
            <Button variant="ghost" size="sm" className="h-8" onClick={() => exportRecruitmentResultsJSON(rowsForExport)}>
              <FileJson className="mr-1.5 size-4" />
              JSON
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {showFilters ? (
          <ContentBlock
            title="Filtros"
            icon={<Filter className="size-4" />}
            className="p-0"
            contentClassName="p-4"
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              <div className="space-y-2 md:col-span-2 lg:col-span-2 xl:col-span-2">
                <Label>Pesquisar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={filters.query}
                    onChange={(e) => {
                      setPage(1);
                      setFilters((f) => ({ ...f, query: e.target.value }));
                    }}
                    placeholder="Nome, alias, clube, pais, IDU..."
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Tabs
                  value={filters.tab}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, tab: v as RecruitmentScoutFilters["tab"] }))
                  }
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="player">Jogadores</TabsTrigger>
                    <TabsTrigger value="coach">Treinadores</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-2">
                <Label>Clube</Label>
                <Select
                  value={filters.club || ALL}
                  onValueChange={(v) => setFilters((f) => ({ ...f, club: v === ALL ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos</SelectItem>
                    {clubs.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>País</Label>
                <Select
                  value={filters.country || ALL}
                  onValueChange={(v) => setFilters((f) => ({ ...f, country: v === ALL ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos</SelectItem>
                    {countries.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Competição</Label>
                <Select
                  value={filters.competition || ALL}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, competition: v === ALL ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas</SelectItem>
                    {competitions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Época</Label>
                <Select
                  value={filters.season == null ? ALL : String(filters.season)}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, season: v === ALL ? null : Number(v) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas</SelectItem>
                    {seasons.map((item) => (
                      <SelectItem key={item} value={String(item)}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Idade min</Label>
                <Input
                  value={filters.minAge ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, minAge: parseNum(e.target.value) }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Idade max</Label>
                <Input
                  value={filters.maxAge ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, maxAge: parseNum(e.target.value) }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Valor min</Label>
                <Input
                  value={filters.minMarketValue ?? ""}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, minMarketValue: parseNum(e.target.value) }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Valor max</Label>
                <Input
                  value={filters.maxMarketValue ?? ""}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, maxMarketValue: parseNum(e.target.value) }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Personalidade</Label>
                <Select
                  value={filters.personality || ALL}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, personality: v === ALL ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas</SelectItem>
                    {personalities.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>IDU</Label>
                <Input
                  value={filters.idu}
                  onChange={(e) => setFilters((f) => ({ ...f, idu: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Posição/Função</Label>
                <Input
                  value={filters.roleOrPosition}
                  onChange={(e) => setFilters((f) => ({ ...f, roleOrPosition: e.target.value }))}
                />
              </div>

              <div className="space-y-2 lg:col-span-2 xl:col-span-2">
                <Label>Scores dinâmicos (Score Studio)</Label>
                <div className="max-h-28 overflow-auto rounded-md border border-border p-2 text-xs text-muted-foreground">
                  {scoreDefs.length
                    ? scoreDefs.map((s) => <div key={s.id}>{s.name}</div>)
                    : "Sem scores ativos"}
                </div>
              </div>

              <div className="space-y-2 lg:col-span-2 xl:col-span-2">
                <Label>Campos dinâmicos (Dictionary)</Label>
                <div className="max-h-28 overflow-auto rounded-md border border-border p-2 text-xs text-muted-foreground">
                  {dictionary ? (
                    <>
                      <div>Atributos: {dictionary.attributes.length}</div>
                      <div>Métricas: {dictionary.metrics.length}</div>
                      <div>Psicológicos: {dictionary.psychological.length}</div>
                    </>
                  ) : (
                    "Sem catálogo"
                  )}
                </div>
              </div>
            </div>
          </ContentBlock>
        ) : null}

        <div className={`grid gap-6 ${detailGridClass}`}>


          <ContentBlock
            className="overflow-hidden p-0"
            contentClassName="p-0"
          >
          <div className="border-b border-border/60 px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-muted/20">
            <div className="flex items-center gap-2 text-sm">
              <ArrowDownUp className="size-4 text-muted-foreground" />
              <span className="font-medium text-muted-foreground">Ordenar por</span>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                <SelectTrigger className="h-8 w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ranking">Ranking</SelectItem>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="club">Clube</SelectItem>
                  <SelectItem value="country">País</SelectItem>
                  <SelectItem value="age">Idade</SelectItem>
                  <SelectItem value="marketValue">Valor mercado</SelectItem>
                  <SelectItem value="currentScore">Score atual</SelectItem>
                  <SelectItem value="potentialScore">Score potencial</SelectItem>
                </SelectContent>
              </Select>
              <ToggleGroup
                type="single"
                value={sortDir}
                onValueChange={(v) => v && setSortDir(v as SortDir)}
              >
                <ToggleGroupItem value="desc">Desc</ToggleGroupItem>
                <ToggleGroupItem value="asc">Asc</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Colunas</span>
              {(
                [
                  "name",
                  "club",
                  "country",
                  "competition",
                  "age",
                  "marketValue",
                  "currentScore",
                  "potentialScore",
                  "ranking",
                  "idu",
                  "personality",
                ] as ColumnKey[]
              ).map((key) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border/50 bg-background/60 px-2 py-1"
                >
                  <Switch
                    checked={visibleColumns.includes(key)}
                    onCheckedChange={(checked) =>
                      setVisibleColumns((prev) => {
                        if (checked) return [...new Set([...prev, key])];
                        if (prev.length === 1) return prev;
                        return prev.filter((c) => c !== key);
                      })
                    }
                  />
                  <span className="text-xs">{COLUMN_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/50">
                <tr className="text-left [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground [&>th]:whitespace-nowrap">
                  <th>Cmp</th>
                  {visibleColumns.includes("name") ? <th>Nome</th> : null}
                  {visibleColumns.includes("club") ? <th>Clube</th> : null}
                  {visibleColumns.includes("country") ? <th>País</th> : null}
                  {visibleColumns.includes("competition") ? (
                    <th>Competição</th>
                  ) : null}
                  {visibleColumns.includes("age") ? <th className="!text-right">Idade</th> : null}
                  {visibleColumns.includes("marketValue") ? <th className="!text-right">Valor</th> : null}
                  {visibleColumns.includes("currentScore") ? (
                    <th className="!text-right">Score A</th>
                  ) : null}
                  {visibleColumns.includes("potentialScore") ? (
                    <th className="!text-right">Score P</th>
                  ) : null}
                  {visibleColumns.includes("ranking") ? <th className="!text-right">Ranking</th> : null}
                  {visibleColumns.includes("idu") ? <th>IDU</th> : null}
                  {visibleColumns.includes("personality") ? (
                    <th>Personalidade</th>
                  ) : null}
                  <th className="!text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={visibleColumns.length + 2}
                      className="p-4 text-center text-muted-foreground"
                    >
                      A carregar dados...
                    </td>
                  </tr>
                ) : null}
                {!isLoading && !paged.length ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 2} className="p-4">
                      <RecruitmentPlaceholder
                        title="Sem resultados"
                        description="Ajusta os filtros e tenta novamente."
                      />
                    </td>
                  </tr>
                ) : null}
                {paged.map((row) => {
                  const meta = (row.metadata ?? {}) as Record<string, unknown>;
                  const checked = compareIds.includes(row.id);
                  const canCompare = checked || compareIds.length < 2;
                  return (
                    <tr
                      key={row.id}
                      className={`border-t border-border/50 cursor-pointer transition-colors ${
                        selected?.id === row.id
                          ? "bg-gold/10 hover:bg-gold/15"
                          : "hover:bg-muted/40"
                      }`}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={checked}
                          disabled={!canCompare}
                          onCheckedChange={(next) => {
                            setCompareIds((prev) => {
                              if (next) return [...new Set([...prev, row.id])].slice(0, 2);
                              return prev.filter((id) => id !== row.id);
                            });
                          }}
                        />
                      </td>
                      {visibleColumns.includes("name") ? (
                        <td className="px-3 py-2 font-semibold text-foreground whitespace-nowrap">{row.name}</td>
                      ) : null}
                      {visibleColumns.includes("club") ? (
                        <td className="px-3 py-2 text-muted-foreground">{row.club ?? "-"}</td>
                      ) : null}
                      {visibleColumns.includes("country") ? (
                        <td className="px-3 py-2 text-muted-foreground">{row.country ?? "-"}</td>
                      ) : null}
                      {visibleColumns.includes("competition") ? (
                        <td className="px-3 py-2 text-muted-foreground">{row.competition ?? "-"}</td>
                      ) : null}
                      {visibleColumns.includes("age") ? (
                        <td className="px-3 py-2 text-right tabular-nums">
                          {(row as { age?: number }).age ?? (asText(meta.age) || "-")}
                        </td>
                      ) : null}
                      {visibleColumns.includes("marketValue") ? (
                        <td className="px-3 py-2 text-right tabular-nums">
                          {fmtMoney(
                            (row as { marketValue?: number }).marketValue ??
                              (Number(meta.marketValue) || 0),
                          )}
                        </td>
                      ) : null}
                      {visibleColumns.includes("currentScore") ? (
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{Math.round(currentScoreOf(row))}</td>
                      ) : null}
                      {visibleColumns.includes("potentialScore") ? (
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{Math.round(potentialScoreOf(row))}</td>
                      ) : null}
                      {visibleColumns.includes("ranking") ? (
                        <td className="px-3 py-2 text-right tabular-nums">{row.ranking ?? "-"}</td>
                      ) : null}
                      {visibleColumns.includes("idu") ? (
                        <td className="px-3 py-2 text-muted-foreground">{asText(meta.idu) || "-"}</td>
                      ) : null}
                      {visibleColumns.includes("personality") ? (
                        <td className="px-3 py-2 text-muted-foreground">{asText(meta.personality) || "-"}</td>
                      ) : null}
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" asChild>
                            <Link
                              to={row.type === "player" ? "/jogadores/$name" : "/treinadores/$name"}
                              params={{ name: row.name }}
                              search={{ tab: undefined }}
                            >
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => navigator.clipboard.writeText(row.name)}
                          >
                            <Copy className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <div>
              Página {page} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Seguinte
              </Button>
            </div>
          </div>
        </ContentBlock>

        {showDetail ? (
        <ContentBlock className="h-fit sticky top-6 max-h-[85vh] overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Detalhe</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowDetail(false)}
              aria-label="Fechar detalhe"
            >
              <PanelRightClose className="size-4" />
            </Button>
          </div>
          <div className="space-y-6">
          <RecruitmentSection
            title="Detalhe rápido"
            description="Painel lateral"
          >
            {selected ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-lg font-semibold leading-tight">{selected.name}</p>
                  <p className="text-muted-foreground">
                    {selected.club ?? "Sem clube"} · {selected.country ?? "Sem país"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Card className="p-2">
                    <p className="text-xs text-muted-foreground">Score atual</p>
                    <p className="font-semibold">{Math.round(currentScoreOf(selected))}</p>
                  </Card>
                  <Card className="p-2">
                    <p className="text-xs text-muted-foreground">Score potencial</p>
                    <p className="font-semibold">{Math.round(potentialScoreOf(selected))}</p>
                  </Card>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" asChild>
                    <Link
                      to={selected.type === "player" ? "/jogadores/$name" : "/treinadores/$name"}
                      params={{ name: selected.name }}
                      search={{ tab: undefined }}
                    >
                      <Eye className="size-4" />
                      Abrir perfil
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(selected.name)}
                  >
                    <Copy className="size-4" />
                    Copiar nome
                  </Button>
                  <RecruitmentPlayerExplainSheet
                    playerName={selected.type === "player" ? selected.name : null}
                    triggerLabel="Explain"
                    triggerVariant="outline"
                    disabled={selected.type !== "player"}
                  />
                  <Button
                    size="sm"
                    variant={isFav.isFavorite ? "default" : "outline"}
                    onClick={isFav.toggle}
                  >
                    {isFav.isFavorite ? (
                      <Heart className="size-4 fill-current" />
                    ) : (
                      <Heart className="size-4" />
                    )}
                    Favorito
                  </Button>
                  <Button size="sm" variant="outline">
                    <Star className="size-4" />
                    Shortlist
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Seleciona um registo para detalhes.</p>
            )}
          </RecruitmentSection>

          <RecruitmentSection title="Comparação">
            <p className="text-sm text-muted-foreground mb-2">Selecionados: {compareIds.length}/2</p>
            <Button asChild disabled={compareIds.length !== 2} className="w-full">
              <Link to="/comparar">
                <GitCompare className="size-4" />
                Abrir comparação
              </Link>
            </Button>
          </RecruitmentSection>

          <RecruitmentSection title="Pesquisas recentes" description="Histórico e favoritos">
            <div className="space-y-2">
              {recent.length ? (
                recent.map((entry) => (
                  <div key={entry.id} className="rounded-md border border-border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="text-left text-sm font-medium hover:underline"
                        onClick={() => {
                          setFilters(entry.filters);
                          setVisibleColumns(entry.columns as ColumnKey[]);
                          setSortBy(entry.sortBy as SortKey);
                          setSortDir(entry.sortDir);
                        }}
                      >
                        {entry.name}
                      </button>
                      <Button size="icon" variant="ghost" onClick={() => toggleFavorite(entry.id)}>
                        <Star className={`size-4 ${entry.favorite ? "fill-current" : ""}`} />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sem pesquisas guardadas.</p>
              )}
            </div>
          </RecruitmentSection>

          <RecruitmentSection title="Quick Actions" description="Ações de fluxo">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportRecruitmentResultsCSV(rowsForExport)}
              >
                <Download className="size-4" />
                Exportar
              </Button>
              <Button variant="outline" size="sm">
                <BookmarkPlus className="size-4" />
                Observação
              </Button>
            </div>
          </RecruitmentSection>
          </div>
        </ContentBlock>
        ) : null}
        </div>
      </div>
    </PremiumLayout>
  );
}
