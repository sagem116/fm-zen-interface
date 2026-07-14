import { useState, useMemo } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  UploadCloud,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  parseCompetitionsFile,
  parsePlayersFile,
  validate,
  type ParsedCompetitionsFile,
  type ParsedPlayersFile,
  type ValidationReport,
} from "@/lib/fm-import-v2";
import { importCompetitionsFile, importPlayersFile } from "@/lib/fm-import-v2-writers";
import {
  parsePlayerProfilesFile,
  type ParsedPlayerProfilesFile,
} from "@/lib/fm-player-profiles-parser";
import { importPlayerProfilesFile } from "@/lib/fm-player-profiles-writer";
import {
  upsertCustomDictionaryEntry,
  type DictionaryCatalogDraft,
  type DictionaryCategory,
} from "@/lib/data-dictionary";
import { logImportFailure } from "@/lib/fm-db";
import { ImportProgressOverlay } from "@/components/ImportProgressOverlay";

interface FileSlot<T> {
  file: File;
  parsed: T;
}

type ImportedFileState =
  | FileSlot<ParsedCompetitionsFile>
  | FileSlot<ParsedPlayersFile>
  | FileSlot<ParsedPlayerProfilesFile>;

type ImportBlockKey =
  "clubs" | "coaches" | "players" | "competitions" | "classifications" | "statistics";

type CompetitionBlockKey = "clubs" | "coaches" | "competitions" | "classifications";

type CompetitionPreviewMetric = { label: string; value: number };

interface ImportBlockConfig {
  key: ImportBlockKey;
  title: string;
  subtitle: string;
  badge: string;
  kind: "competitions" | "players" | "profiles";
  actionLabel: string;
  previewMetrics?: (parsed: ParsedCompetitionsFile) => CompetitionPreviewMetric[];
}

type UnknownColumnDraft = DictionaryCatalogDraft & {
  header: string;
  aliasesText: string;
};

const CATEGORY_OPTIONS: Array<{ value: DictionaryCategory; label: string }> = [
  { value: "identifiers", label: "Identifier" },
  { value: "profile_fields", label: "Profile Field" },
  { value: "attributes", label: "Attribute" },
  { value: "metrics", label: "Metric" },
  { value: "contexts", label: "Context" },
  { value: "ratings", label: "Rating" },
  { value: "modifiers", label: "Modifier" },
  { value: "derived_fields", label: "Derived Field" },
];

const IMPORT_BLOCKS: ImportBlockConfig[] = [
  {
    key: "clubs",
    title: "Clubes",
    subtitle: "Clube País · Reputações de clubes",
    badge: "Competições",
    kind: "competitions",
    actionLabel: "Importar clubes",
    previewMetrics: (parsed) => [
      { label: "Clubes", value: parsed.clubCountry.length },
      { label: "Reputações", value: parsed.clubReputation.length },
    ],
  },
  {
    key: "coaches",
    title: "Treinadores",
    subtitle: "Treinadores de clubes e seleções",
    badge: "Competições",
    kind: "competitions",
    actionLabel: "Importar treinadores",
    previewMetrics: (parsed) => [
      { label: "Treinadores", value: parsed.coaches.length },
      { label: "Seleções", value: parsed.coaches.filter((coach) => coach.is_national_team).length },
    ],
  },
  {
    key: "players",
    title: "Jogadores",
    subtitle: "Perfil completo dos jogadores",
    badge: "Perfil",
    kind: "profiles",
    actionLabel: "Importar jogadores",
  },
  {
    key: "competitions",
    title: "Competições",
    subtitle: "Reputação das competições",
    badge: "Competições",
    kind: "competitions",
    actionLabel: "Importar competições",
    previewMetrics: (parsed) => [
      { label: "Competições", value: parsed.competitionReputation.length },
      { label: "Folhas", value: parsed.presentSheets.length },
    ],
  },
  {
    key: "classifications",
    title: "Classificações",
    subtitle: "Standings, continentais e internacionais",
    badge: "Competições",
    kind: "competitions",
    actionLabel: "Importar classificações",
    previewMetrics: (parsed) => [
      { label: "Standings", value: parsed.standings.length },
      { label: "Continentais", value: parsed.continental.length },
      { label: "Internacionais", value: parsed.international.length },
    ],
  },
  {
    key: "statistics",
    title: "Estatísticas (Competições + Jogadores)",
    subtitle: "Estatísticas de competições e jogadores",
    badge: "Estatísticas",
    kind: "players",
    actionLabel: "Importar estatísticas",
  },
];

const COMPETITION_BLOCK_KEYS: CompetitionBlockKey[] = [
  "clubs",
  "coaches",
  "competitions",
  "classifications",
];
const IMPORT_BLOCK_KEYS = COMPETITION_BLOCK_KEYS;

function buildUnknownDraft(header: string): UnknownColumnDraft {
  return {
    header,
    name: header,
    abbreviation: header.slice(0, 12),
    category: "metrics",
    entityKind: "player",
    description: "",
    unit: "",
    source: "import-player-profile",
    originType: "raw",
    discoverable: true,
    aliases: [header],
    aliasesText: header,
  };
}

export function SeasonImporterV2() {
  const qc = useQueryClient();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [blocks, setBlocks] = useState<Record<ImportBlockKey, ImportedFileState | null>>({
    clubs: null,
    coaches: null,
    players: null,
    competitions: null,
    classifications: null,
    statistics: null,
  });
  const [unknownDrafts, setUnknownDrafts] = useState<UnknownColumnDraft[]>([]);
  const [importingBlock, setImportingBlock] = useState<ImportBlockKey | null>(null);
  const [report, setReport] = useState<ValidationReport | null>(null);

  const competitionParsed = useMemo(() => {
    for (const key of COMPETITION_BLOCK_KEYS) {
      const slot = blocks[key];
      if (slot && "clubCountry" in slot.parsed) return slot.parsed as ParsedCompetitionsFile;
    }
    return null;
  }, [blocks]);

  const statisticsParsed = blocks.statistics
    ? (blocks.statistics.parsed as ParsedPlayersFile)
    : null;
  const profilesParsed = blocks.players
    ? (blocks.players.parsed as ParsedPlayerProfilesFile)
    : null;

  const validation = useMemo<ValidationReport | null>(() => {
    if (!competitionParsed && !statisticsParsed) return null;
    const c =
      competitionParsed ??
      ({
        clubCountry: [],
        clubReputation: [],
        competitionReputation: [],
        coaches: [],
        standings: [],
        continental: [],
        international: [],
        presentSheets: [],
        ignoredSheets: [],
        warnings: [],
        fatal: [],
      } as unknown as ParsedCompetitionsFile);
    const p =
      statisticsParsed ??
      ({
        players: [],
        bySheet: {},
        ignoredSheets: [],
        warnings: [],
        fatal: [],
      } as unknown as ParsedPlayersFile);
    return validate(c, p);
  }, [competitionParsed, statisticsParsed]);

  async function handleFile(kind: ImportBlockKey, file: File) {
    const block = IMPORT_BLOCKS.find((entry) => entry.key === kind);
    if (!block) return;

    try {
      const buf = await file.arrayBuffer();
      if (block.kind === "competitions") {
        setBlocks((prev) => ({ ...prev, [kind]: { file, parsed: parseCompetitionsFile(buf) } }));
      } else if (block.kind === "players") {
        setBlocks((prev) => ({ ...prev, [kind]: { file, parsed: parsePlayersFile(buf) } }));
      } else {
        const parsed = parsePlayerProfilesFile(buf);
        setBlocks((prev) => ({ ...prev, [kind]: { file, parsed } }));
        setUnknownDrafts(parsed.unknownColumns.map((header) => buildUnknownDraft(header)));
      }
    } catch (err) {
      toast.error(`Erro a ler ${file.name}: ${(err as Error).message}`);
    }
  }

  function clearBlock(kind: ImportBlockKey) {
    setBlocks((prev) => ({ ...prev, [kind]: null }));
    if (kind === "players") setUnknownDrafts([]);
  }

  async function refreshProfilesAfterDictionaryUpdate() {
    const slot = blocks.players;
    if (!slot) return;
    const buf = await slot.file.arrayBuffer();
    const parsed = parsePlayerProfilesFile(buf);
    setBlocks((prev) => ({ ...prev, players: { file: slot.file, parsed } }));
    setUnknownDrafts(parsed.unknownColumns.map((header) => buildUnknownDraft(header)));
  }

  async function saveUnknownColumn(draft: UnknownColumnDraft) {
    upsertCustomDictionaryEntry({
      name: draft.name,
      abbreviation: draft.abbreviation,
      category: draft.category,
      entityKind: draft.entityKind,
      description: draft.description,
      unit: draft.unit,
      source: draft.source,
      originType: draft.originType,
      discoverable: draft.discoverable,
      aliases: draft.aliasesText
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
    });
    await refreshProfilesAfterDictionaryUpdate();
  }

  async function saveAllUnknownColumns() {
    for (const draft of unknownDrafts) {
      upsertCustomDictionaryEntry({
        name: draft.name,
        abbreviation: draft.abbreviation,
        category: draft.category,
        entityKind: draft.entityKind,
        description: draft.description,
        unit: draft.unit,
        source: draft.source,
        originType: draft.originType,
        discoverable: draft.discoverable,
        aliases: draft.aliasesText
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
      });
    }
    await refreshProfilesAfterDictionaryUpdate();
    toast.success("Colunas não reconhecidas guardadas no Dicionário.");
  }

  async function runImport(kind: ImportBlockKey) {
    const slot = blocks[kind];
    if (!slot) return;
    setImportingBlock(kind);
    try {
      if (kind === "players") {
        const parsed = slot.parsed as ParsedPlayerProfilesFile;
        const result = await importPlayerProfilesFile(year, parsed, {
          module: "players",
          filename: slot.file.name,
        });
        toast.success(
          `Jogadores ${year}: ${result.inserted} jogadores · ${result.attributes} atributos`,
        );
        clearBlock(kind);
      } else if (kind === "statistics") {
        const parsed = slot.parsed as ParsedPlayersFile;
        const result = await importPlayersFile(year, parsed, competitionParsed?.clubCountry ?? [], {
          module: "statistics",
          filename: slot.file.name,
        });
        toast.success(
          `Estatísticas ${year}: ${result.inserted} registos (${result.sheets.join(", ")})`,
        );
        clearBlock(kind);
      } else {
        const parsed = slot.parsed as ParsedCompetitionsFile;
        const scopeByBlock: Record<
          CompetitionBlockKey,
          "clubs" | "coaches" | "competitions" | "classifications"
        > = {
          clubs: "clubs",
          coaches: "coaches",
          competitions: "competitions",
          classifications: "classifications",
        };
        const result = await importCompetitionsFile(year, parsed, {
          scope: scopeByBlock[kind as CompetitionBlockKey],
          filename: slot.file.name,
        });
        const labels: Record<CompetitionBlockKey, string> = {
          clubs: `${result.clubsUpserted} clubes`,
          coaches: `${result.coachesUpserted} treinadores`,
          competitions: `${result.competitionReputationRows} reputações de comp.`,
          classifications: `${result.standingsInserted} classificações`,
        };
        toast.success(
          `${IMPORT_BLOCKS.find((entry) => entry.key === kind)?.title} ${year}: ${labels[kind as CompetitionBlockKey]}`,
        );
        clearBlock(kind);
      }

      qc.removeQueries();
      await qc.invalidateQueries();
      setReport(validation);
    } catch (err) {
      const message = (err as Error).message;
      const moduleByBlock: Record<
        ImportBlockKey,
        "clubs" | "coaches" | "players" | "competitions" | "classifications" | "statistics"
      > = {
        clubs: "clubs",
        coaches: "coaches",
        players: "players",
        competitions: "competitions",
        classifications: "classifications",
        statistics: "statistics",
      };
      await logImportFailure(year, moduleByBlock[kind], slot.file.name, message);
      toast.error(`Erro: ${message}`);
    } finally {
      setImportingBlock(null);
    }
  }

  const canImport = year > 1900 && !importingBlock;

  const selectedCompFatal = COMPETITION_BLOCK_KEYS.map((key) => blocks[key])
    .filter((slot): slot is NonNullable<typeof slot> => !!slot && "fatal" in slot.parsed)
    .flatMap((slot) => (slot.parsed as ParsedCompetitionsFile).fatal);
  const selectedStatsFatal = blocks.statistics
    ? (blocks.statistics.parsed as ParsedPlayersFile).fatal
    : [];
  const selectedProfilesFatal = blocks.players
    ? (blocks.players.parsed as ParsedPlayerProfilesFile).fatal
    : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Época</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Label htmlFor="year-v2">Ano</Label>
            <Input
              id="year-v2"
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {IMPORT_BLOCKS.map((block) => {
          const slot = blocks[block.key];
          const parsed = slot?.parsed;
          return (
            <Card key={block.key} className="h-full">
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{block.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{block.subtitle}</p>
                  </div>
                  <Badge variant="secondary">{block.badge}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Dropzone
                  title={block.title}
                  subtitle={block.subtitle}
                  file={slot?.file}
                  onFile={(f) => handleFile(block.key, f)}
                  onClear={() => clearBlock(block.key)}
                />

                {block.kind === "competitions" && parsed && "clubCountry" in parsed && (
                  <FilePreviewComp
                    parsed={parsed as ParsedCompetitionsFile}
                    filename={slot?.file.name ?? ""}
                    badge={block.badge}
                    metrics={block.previewMetrics?.(parsed as ParsedCompetitionsFile) ?? []}
                    // For partial competition uploads (clubs / competitions blocks)
                    // show a constrained expected-sheets number relevant to the block.
                    expectedSheets={
                      block.key === "clubs" ? 2 : block.key === "competitions" ? 1 : undefined
                    }
                  />
                )}

                {block.kind === "players" && parsed && "players" in parsed && (
                  <FilePreviewPlayers
                    parsed={parsed as ParsedPlayersFile}
                    filename={slot?.file.name ?? ""}
                  />
                )}

                {block.kind === "profiles" && parsed && "unknownColumns" in parsed && (
                  <FilePreviewProfiles
                    parsed={parsed as ParsedPlayerProfilesFile}
                    filename={slot?.file.name ?? ""}
                    drafts={unknownDrafts}
                    onDraftChange={(idx, patch) => {
                      setUnknownDrafts((prev) =>
                        prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
                      );
                    }}
                    onSaveOne={(idx) => saveUnknownColumn(unknownDrafts[idx])}
                    onSaveAll={saveAllUnknownColumns}
                  />
                )}

                <ImportProgressOverlay
                  active={importingBlock === block.key}
                  label={`A importar: ${block.title}`}
                  historyKey={`season-${block.key}`}
                />

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => runImport(block.key)}
                    disabled={!slot || importingBlock === block.key}
                  >
                    {importingBlock === block.key && (
                      <Loader2 className="size-4 animate-spin mr-2" />
                    )}
                    {block.actionLabel}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
        <ReportCard report={validation} title="Pré-validação" />
      )}

      {(selectedCompFatal.length > 0 ||
        selectedStatsFatal.length > 0 ||
        selectedProfilesFatal.length > 0) && (
        <p className="text-sm text-destructive">Corrija os erros vermelhos antes de importar.</p>
      )}

      {report && <ReportCard report={report} title={`Relatório da importação — Época ${year}`} />}
    </div>
  );
}

function Dropzone({
  title,
  subtitle,
  file,
  onFile,
  onClear,
}: {
  title: string;
  subtitle: string;
  file: File | undefined;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f && /\.xlsx?$/i.test(f.name)) onFile(f);
      }}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors min-h-[160px] ${
        over ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
      }`}
    >
      <UploadCloud className="size-6 text-primary" />
      <p className="font-medium text-sm text-center">{title}</p>
      <p className="text-xs text-muted-foreground text-center">{subtitle}</p>
      {file ? (
        <div className="flex items-center gap-2 mt-1 rounded-md bg-muted px-3 py-1.5">
          <FileSpreadsheet className="size-4 text-primary" />
          <span className="text-xs truncate max-w-[200px]">{file.name}</span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onClear();
            }}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <span className="text-[11px] text-muted-foreground mt-1">Arraste ou clique</span>
      )}
      <Input
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </label>
  );
}

function FilePreviewComp({
  parsed,
  filename,
  badge,
  metrics,
  expectedSheets: expectedSheetsProp,
}: {
  parsed: ParsedCompetitionsFile;
  filename: string;
  badge: string;
  metrics: CompetitionPreviewMetric[];
  expectedSheets?: number | undefined;
}) {
  const safeMetrics = metrics ?? [];
  const diagnostics = parsed?.diagnostics ?? {
    sheets: {
      found: [],
      expected: [],
      aliases: [],
      recognized: [],
      ignored: [],
    },
    sheetReports: [],
    summary: {
      expectedSheets: 0,
      recognizedSheets: 0,
      ignoredSheets: 0,
      recognizedColumns: 0,
      missingRequiredColumns: 0,
      aliasesUsed: 0,
      unknownColumns: 0,
      validRows: 0,
      ignoredRows: 0,
    },
  };
  const presentSheets = parsed?.presentSheets ?? [];
  const rejectedRows: Array<{
    sheet: string;
    rowNumber: number;
    stage: string;
    reason: string;
    validatedFields?: Array<{ label: string; ok: boolean }>;
  }> =
    (
      parsed as unknown as {
        rejectedRows?: Array<{
          sheet: string;
          rowNumber: number;
          stage: string;
          reason: string;
          validatedFields?: Array<{ label: string; ok: boolean }>;
        }>;
      }
    )?.rejectedRows ?? [];
  const ignoredSheets = parsed?.ignoredSheets ?? [];
  const fatal = parsed?.fatal ?? [];
  const summary = diagnostics.summary;
  const expectedSheets = expectedSheetsProp ?? summary.expectedSheets;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileSpreadsheet className="size-4 text-primary" /> {filename}
        </CardTitle>
        <Badge variant="secondary">{badge}</Badge>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <Grid>
          {safeMetrics.map((metric) => (
            <Stat key={metric.label} label={metric.label} v={metric.value} />
          ))}
        </Grid>
        <Stat label="Folhas reconhecidas" v={presentSheets.length} />

        <details>
          <summary className="cursor-pointer text-foreground font-medium">Folhas</summary>
          <div className="mt-2 space-y-2 text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">Folhas encontradas</p>
              <p>{diagnostics.sheets.found.join(", ") || "(sem folhas)"}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Aliases esperados</p>
              <p>{diagnostics.sheets.aliases.join(", ") || "(nenhum)"}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Folhas ignoradas</p>
              <p>{diagnostics.sheets.ignored.join(", ") || "(nenhuma)"}</p>
            </div>
          </div>
        </details>

        {diagnostics.sheetReports.map((sheet) => {
          const required = sheet.required ?? [];
          const missingRequired = sheet.missingRequired ?? [];
          const recognizedColumns = sheet.recognizedColumns ?? [];
          const unknownColumns = sheet.unknownColumns ?? [];
          const aliasesUsed = sheet.aliasesUsed ?? [];

          return (
            <details key={sheet.sheet}>
              <summary className="cursor-pointer text-foreground font-medium">
                {sheet.sheet} - {sheet.recognized ? "✓ Nome reconhecido" : "✗ Não reconhecida"}
              </summary>
              <div className="mt-2 space-y-2">
                <p className="text-foreground font-medium">Etapa</p>
                <p className="text-muted-foreground">{sheet.stage}</p>
                <p className="text-foreground font-medium">Motivo</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{sheet.reason}</p>
                <div>
                  <p className="text-foreground font-medium">Colunas obrigatórias</p>
                  {required.length > 0 ? (
                    required.map((column) => (
                      <p
                        key={`${sheet.sheet}-required-${column}`}
                        className="text-muted-foreground"
                      >
                        {missingRequired.includes(column) ? "✗" : "✓"} {column}
                      </p>
                    ))
                  ) : (
                    <p className="text-muted-foreground">(não aplicável)</p>
                  )}
                </div>
                <div>
                  <p className="text-foreground font-medium">Reconhecidas</p>
                  <p className="text-muted-foreground">
                    {recognizedColumns.join(", ") || "(nenhuma)"}
                  </p>
                </div>
                <div>
                  <p className="text-foreground font-medium">Desconhecidas</p>
                  <p className="text-muted-foreground">
                    {unknownColumns.join(", ") || "(nenhuma)"}
                  </p>
                </div>
                {aliasesUsed.length > 0 && (
                  <div>
                    <p className="text-foreground font-medium">Mapeamentos automáticos</p>
                    {aliasesUsed.map((alias, idx) => (
                      <p key={`${sheet.sheet}-alias-${idx}`} className="text-muted-foreground">
                        {alias.from}
                        {" -> "}
                        {alias.to} (alias)
                      </p>
                    ))}
                  </div>
                )}
                <Grid>
                  <Stat label="Linhas válidas" v={sheet.validRows ?? 0} />
                  <Stat label="Linhas ignoradas" v={sheet.ignoredRows ?? 0} />
                </Grid>
              </div>
            </details>
          );
        })}

        <details>
          <summary className="cursor-pointer text-foreground font-medium">Resumo do parser</summary>
          <div className="mt-2">
            <Grid>
              <Stat label="Folhas esperadas" v={expectedSheets} />
              <Stat label="Folhas reconhecidas" v={summary.recognizedSheets} />
              <Stat label="Folhas ignoradas" v={summary.ignoredSheets} />
              <Stat label="Colunas reconhecidas" v={summary.recognizedColumns} />
              <Stat label="Obrigatórias em falta" v={summary.missingRequiredColumns} />
              <Stat label="Aliases utilizados" v={summary.aliasesUsed} />
              <Stat label="Colunas desconhecidas" v={summary.unknownColumns} />
              <Stat label="Linhas válidas" v={summary.validRows} />
              <Stat label="Linhas ignoradas" v={summary.ignoredRows} />
            </Grid>
          </div>
        </details>

        {rejectedRows.length > 0 && (
          <details open>
            <summary className="cursor-pointer text-foreground font-medium">
              Linhas rejeitadas ({rejectedRows.length} primeiras)
            </summary>
            <div className="mt-3 space-y-3">
              {rejectedRows.map((row) => (
                <div
                  key={`${row.sheet}-${row.rowNumber}`}
                  className="rounded-md border border-border p-3 space-y-2"
                >
                  <p className="font-medium text-foreground">Linha {row.rowNumber}</p>
                  <p className="text-muted-foreground">Etapa: {row.stage}</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {(row.validatedFields ?? []).map((field) => (
                      <p key={`${row.rowNumber}-${field.label}`} className="text-muted-foreground">
                        {field.ok ? "✓" : "✗"} {field.label}
                      </p>
                    ))}
                  </div>
                  <p className="font-medium text-foreground">Motivo</p>
                  <p className="text-muted-foreground">{row.reason}</p>
                </div>
              ))}
            </div>
          </details>
        )}

        {ignoredSheets.length > 0 && (
          <p className="text-muted-foreground italic pt-1">Ignoradas: {ignoredSheets.join(", ")}</p>
        )}
        {fatal.length > 0 &&
          fatal.map((m, i) => (
            <p key={i} className="text-destructive flex items-center gap-1">
              <XCircle className="size-3" /> {m}
            </p>
          ))}
      </CardContent>
    </Card>
  );
}

function FilePreviewPlayers({ parsed, filename }: { parsed: ParsedPlayersFile; filename: string }) {
  const summary = parsed.diagnostics.summary;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileSpreadsheet className="size-4 text-primary" /> {filename}
        </CardTitle>
        <Badge variant="secondary">Jogadores</Badge>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <Grid>
          {Object.values(parsed.bySheet).map((s) => (
            <Stat key={s.sheet} label={s.sheet} v={s.count} />
          ))}
          <Stat label="Total jogadores" v={parsed.players.length} />
        </Grid>

        <details>
          <summary className="cursor-pointer text-foreground font-medium">Folhas</summary>
          <div className="mt-2 space-y-2 text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">Folhas encontradas</p>
              <p>{parsed.diagnostics.sheets.found.join(", ") || "(sem folhas)"}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Folhas esperadas</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {Object.entries(parsed.diagnostics.sheets.expected).map(([group, aliases]) => (
                  <li key={group}>
                    {group}: {aliases.join(" / ")}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">Folhas ignoradas</p>
              <p>{parsed.ignoredSheets.join(", ") || "(nenhuma)"}</p>
            </div>
          </div>
        </details>

        {parsed.diagnostics.sheetReports.map((sheet) => {
          const pipeline = sheet.pipeline ?? {
            reading: { status: "rejected", reason: "Sem diagnóstico de leitura." },
            resolver: { status: "rejected", reason: "Sem diagnóstico de resolver." },
            validation: { status: "rejected", reason: "Sem diagnóstico de validação." },
            dispatcher: { status: "rejected", reason: "Sem diagnóstico de dispatcher." },
            parser: { status: "rejected", reason: "Sem diagnóstico de parser." },
            importation: { status: "rejected", reason: "Sem diagnóstico de importação." },
          };

          return (
            <details key={sheet.sheet}>
              <summary className="cursor-pointer text-foreground font-medium">
                Diagnóstico: {sheet.sheet}
              </summary>
              <div className="mt-2 space-y-2">
                <div className="space-y-1">
                  <p className="font-medium">Pipeline</p>
                  <p className="text-muted-foreground">
                    Leitura: {pipeline.reading.status === "ok" ? "✓" : "✗"} -{" "}
                    {pipeline.reading.reason}
                  </p>
                  <p className="text-muted-foreground">
                    Resolver: {pipeline.resolver.status === "ok" ? "✓" : "✗"} -{" "}
                    {pipeline.resolver.reason}
                  </p>
                  <p className="text-muted-foreground">
                    Validação: {pipeline.validation.status === "ok" ? "✓" : "✗"} -{" "}
                    {pipeline.validation.reason}
                  </p>
                  <p className="text-muted-foreground">
                    Dispatcher: {pipeline.dispatcher.status === "ok" ? "✓" : "✗"} -{" "}
                    {pipeline.dispatcher.reason}
                  </p>
                  <p className="text-muted-foreground">
                    Parser: {pipeline.parser.status === "ok" ? "✓" : "✗"} - {pipeline.parser.reason}
                  </p>
                  <p className="text-muted-foreground">
                    Importação: {pipeline.importation.status === "ok" ? "✓" : "✗"} -{" "}
                    {pipeline.importation.reason}
                  </p>
                </div>

                <div>
                  <p className="font-medium">Colunas obrigatórias</p>
                  {sheet.required.map((column) => (
                    <p key={`${sheet.sheet}-required-${column}`} className="text-muted-foreground">
                      {sheet.missingRequired.includes(column) ? "[x]" : "[ok]"} {column}
                    </p>
                  ))}
                </div>

                <div>
                  <p className="font-medium">Reconhecidas ({sheet.recognized.length})</p>
                  <p className="text-muted-foreground">
                    {sheet.recognized.join(", ") || "(nenhuma)"}
                  </p>
                </div>

                <div>
                  <p className="font-medium">Colunas desconhecidas ({sheet.unknown.length})</p>
                  <p className="text-muted-foreground">{sheet.unknown.join(", ") || "(nenhuma)"}</p>
                </div>

                {sheet.aliasesUsed.length > 0 && (
                  <div>
                    <p className="font-medium">Mapeamentos automáticos (alias)</p>
                    {sheet.aliasesUsed.slice(0, 30).map((alias, idx) => (
                      <p key={`${sheet.sheet}-alias-${idx}`} className="text-muted-foreground">
                        {alias.from}
                        {" -> "}
                        {alias.to} (alias)
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </details>
          );
        })}

        <details>
          <summary className="cursor-pointer text-foreground font-medium">Resumo do parser</summary>
          <div className="mt-2">
            <Grid>
              <Stat label="Folhas esperadas" v={summary.expectedSheets} />
              <Stat label="Folhas reconhecidas" v={summary.recognizedSheets} />
              <Stat label="Folhas ignoradas" v={summary.ignoredSheets} />
              <Stat label="Colunas reconhecidas" v={summary.recognizedColumns} />
              <Stat label="Obrigatórias em falta" v={summary.missingRequiredColumns} />
              <Stat label="Aliases utilizados" v={summary.aliasesUsed} />
              <Stat label="Colunas desconhecidas" v={summary.unknownColumns} />
              <Stat label="Linhas válidas" v={summary.validRows} />
              <Stat label="Linhas ignoradas" v={summary.ignoredRows} />
            </Grid>
          </div>
        </details>

        {parsed.ignoredSheets.length > 0 && (
          <p className="text-muted-foreground italic pt-1">
            Ignoradas: {parsed.ignoredSheets.join(", ")}
          </p>
        )}
        {parsed.fatal.length > 0 &&
          parsed.fatal.map((m, i) => (
            <p key={i} className="text-destructive flex items-center gap-1">
              <XCircle className="size-3" /> {m}
            </p>
          ))}
      </CardContent>
    </Card>
  );
}

function FilePreviewProfiles({
  parsed,
  filename,
  drafts,
  onDraftChange,
  onSaveOne,
  onSaveAll,
}: {
  parsed: ParsedPlayerProfilesFile;
  filename: string;
  drafts: UnknownColumnDraft[];
  onDraftChange: (idx: number, patch: Partial<UnknownColumnDraft>) => void;
  onSaveOne: (idx: number) => void | Promise<void>;
  onSaveAll: () => void | Promise<void>;
}) {
  const knownAttrs = Object.keys(parsed.attributeColumnMap).length;
  const knownMetrics = Object.keys(parsed.metricColumnMap).length;
  const summary = parsed.diagnostics.summary;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileSpreadsheet className="size-4 text-primary" /> {filename}
        </CardTitle>
        <Badge variant="secondary">Perfil Completo dos Jogadores</Badge>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <Grid>
          <Stat label="Jogadores" v={parsed.players.length} />
          <Stat label="Atributos reconhecidos" v={knownAttrs} />
          <Stat label="Métricas reconhecidas" v={knownMetrics} />
          <Stat label="Atributos em falta" v={parsed.missingAttributes.length} />
          <Stat label="Colunas desconhecidas" v={parsed.unknownColumns.length} />
        </Grid>
        {parsed.ignoredSheets.length > 0 && (
          <p className="text-muted-foreground italic">
            Folhas ignoradas: {parsed.ignoredSheets.join(", ")}
          </p>
        )}

        <details>
          <summary className="cursor-pointer text-foreground font-medium">Folhas</summary>
          <div className="mt-2 space-y-2 text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">Folhas encontradas</p>
              <p>{parsed.diagnostics.sheets.found.join(", ") || "(sem folhas)"}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Folhas esperadas</p>
              <p>{parsed.diagnostics.sheets.expected.join(", ")}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Aliases aceites para a folha</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {parsed.diagnostics.sheets.expectedAliases.map((alias) => (
                  <li key={alias}>{alias}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">Folhas ignoradas</p>
              <p>{parsed.diagnostics.sheets.ignored.join(", ") || "(nenhuma)"}</p>
            </div>
          </div>
        </details>

        <details>
          <summary className="cursor-pointer text-foreground font-medium">
            Colunas obrigatórias
          </summary>
          <div className="mt-2 space-y-1">
            {parsed.diagnostics.columns.required.map((column) => (
              <p key={`required-${column}`} className="text-muted-foreground">
                {parsed.diagnostics.columns.missingRequired.includes(column) ? "[x]" : "[ok]"}{" "}
                {column}
              </p>
            ))}
          </div>
        </details>

        <details>
          <summary className="cursor-pointer text-foreground font-medium">
            Reconhecidas ({parsed.diagnostics.columns.recognized.length})
          </summary>
          <p className="mt-2 text-muted-foreground">
            {parsed.diagnostics.columns.recognized.join(", ") || "(nenhuma)"}
          </p>
        </details>

        {parsed.diagnostics.columns.aliasesUsed.length > 0 && (
          <details>
            <summary className="cursor-pointer text-foreground font-medium">
              Mapeamentos automáticos (alias)
            </summary>
            <div className="mt-2 space-y-1">
              {parsed.diagnostics.columns.aliasesUsed.slice(0, 40).map((alias, idx) => (
                <p key={`profile-alias-${idx}`} className="text-muted-foreground">
                  {alias.from}
                  {" -> "}
                  {alias.to} (alias)
                </p>
              ))}
            </div>
          </details>
        )}

        {parsed.diagnostics.rejectionReason && (
          <details open>
            <summary className="cursor-pointer text-destructive font-medium">
              Motivo da rejeição
            </summary>
            <pre className="mt-2 whitespace-pre-wrap text-destructive/90 font-sans">
              {parsed.diagnostics.rejectionReason}
            </pre>
          </details>
        )}

        <details>
          <summary className="cursor-pointer text-foreground font-medium">Resumo do parser</summary>
          <div className="mt-2">
            <Grid>
              <Stat label="Folhas esperadas" v={summary.expectedSheets} />
              <Stat label="Folhas reconhecidas" v={summary.recognizedSheets} />
              <Stat label="Folhas ignoradas" v={summary.ignoredSheets} />
              <Stat label="Colunas reconhecidas" v={summary.recognizedColumns} />
              <Stat label="Obrigatórias em falta" v={summary.missingRequiredColumns} />
              <Stat label="Aliases utilizados" v={summary.aliasesUsed} />
              <Stat label="Colunas desconhecidas" v={summary.unknownColumns} />
              <Stat label="Linhas válidas" v={summary.validRows} />
              <Stat label="Linhas ignoradas" v={summary.ignoredRows} />
            </Grid>
          </div>
        </details>

        {parsed.missingAttributes.length > 0 && (
          <details>
            <summary className="cursor-pointer text-warning font-medium">
              Atributos em falta ({parsed.missingAttributes.length})
            </summary>
            <p className="mt-1 text-muted-foreground">{parsed.missingAttributes.join(", ")}</p>
          </details>
        )}
        {parsed.unknownColumns.length > 0 && (
          <details>
            <summary className="cursor-pointer text-warning font-medium">
              Colunas não reconhecidas ({parsed.unknownColumns.length})
            </summary>
            <div className="mt-3 space-y-3">
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => onSaveAll()}>
                  Guardar todas no Dicionário
                </Button>
              </div>
              {drafts.map((d, idx) => (
                <div
                  key={`${d.header}-${idx}`}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  <p className="text-xs font-semibold text-foreground">Cabeçalho: {d.header}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px]">Nome</Label>
                      <Input
                        value={d.name}
                        onChange={(e) => onDraftChange(idx, { name: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Abreviatura</Label>
                      <Input
                        value={d.abbreviation}
                        onChange={(e) => onDraftChange(idx, { abbreviation: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Categoria</Label>
                      <select
                        value={d.category}
                        onChange={(e) =>
                          onDraftChange(idx, { category: e.target.value as DictionaryCategory })
                        }
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-[11px]">Unidade</Label>
                      <Input
                        value={d.unit ?? ""}
                        onChange={(e) => onDraftChange(idx, { unit: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Source</Label>
                      <Input
                        value={d.source ?? ""}
                        onChange={(e) => onDraftChange(idx, { source: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Origin Type</Label>
                      <select
                        value={d.originType}
                        onChange={(e) =>
                          onDraftChange(idx, { originType: e.target.value as "raw" | "derived" })
                        }
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="raw">raw</option>
                        <option value="derived">derived</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[11px]">Descrição</Label>
                    <Input
                      value={d.description ?? ""}
                      onChange={(e) => onDraftChange(idx, { description: e.target.value })}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Aliases (separados por vírgula)</Label>
                    <Input
                      value={d.aliasesText}
                      onChange={(e) => onDraftChange(idx, { aliasesText: e.target.value })}
                      className="h-8"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => onSaveOne(idx)}>
                      Guardar no Dicionário
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
        {parsed.duplicateColumns.length > 0 && (
          <details>
            <summary className="cursor-pointer text-warning font-medium">
              Colunas duplicadas ({parsed.duplicateColumns.length})
            </summary>
            <p className="mt-1 text-muted-foreground">{parsed.duplicateColumns.join(", ")}</p>
          </details>
        )}
        {parsed.duplicatePlayers.length > 0 && (
          <details>
            <summary className="cursor-pointer text-warning font-medium">
              Jogadores duplicados ({parsed.duplicatePlayers.length})
            </summary>
            <p className="mt-1 text-muted-foreground">{parsed.duplicatePlayers.join(", ")}</p>
          </details>
        )}
        {parsed.fatal.length > 0 &&
          parsed.fatal.map((m, i) => (
            <p key={i} className="text-destructive flex items-center gap-1">
              <XCircle className="size-3" /> {m}
            </p>
          ))}
      </CardContent>
    </Card>
  );
}

function ReportCard({ report, title }: { report: ValidationReport; title: string }) {
  const { stats } = report;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {report.errors.length > 0 ? (
            <XCircle className="size-4 text-destructive" />
          ) : (
            <CheckCircle2 className="size-4 text-success" />
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Grid>
          <Stat label="Clubes (Clube Pais)" v={stats.clubsInCountryMap} />
          <Stat label="Clubes com reputação" v={stats.clubsWithReputation} />
          <Stat label="Comp. com reputação" v={stats.competitionsWithReputation} />
          <Stat label="Treinadores" v={stats.coaches} />
          <Stat label="Treinadores seleções" v={stats.nationalTeamCoaches} />
          <Stat label="Standings" v={stats.standings} />
          <Stat label="Continentais" v={stats.continentalRows} />
          <Stat label="Internacional" v={stats.internationalRows} />
          <Stat label="Jogadores" v={stats.players} />
        </Grid>

        {report.errors.length > 0 && (
          <Section title="Erros" items={report.errors} icon={XCircle} tone="destructive" />
        )}

        {stats.clubsWithoutCountry.length > 0 && (
          <IssueList title="Clubes sem país" items={stats.clubsWithoutCountry} />
        )}
        {stats.duplicateClubs.length > 0 && (
          <IssueList title="Clubes duplicados (Clube Pais)" items={stats.duplicateClubs} />
        )}
        {stats.clubsWithoutReputation.length > 0 && (
          <IssueList title="Clubes sem reputação" items={stats.clubsWithoutReputation} />
        )}
        {stats.clubsWithoutPlayers.length > 0 && (
          <IssueList title="Clubes sem jogadores" items={stats.clubsWithoutPlayers} />
        )}
        {stats.competitionsWithoutReputation.length > 0 && (
          <IssueList
            title="Competições sem reputação"
            items={stats.competitionsWithoutReputation}
          />
        )}
        {stats.unmappedClubsInPlayers.length > 0 && (
          <IssueList
            title="Clubes em jogadores mas não em Clube Pais"
            items={stats.unmappedClubsInPlayers}
          />
        )}
        {stats.coachesWithoutAssignment.length > 0 && (
          <IssueList
            title="Treinadores sem clube nem seleção"
            items={stats.coachesWithoutAssignment}
          />
        )}
        {stats.playersWithoutClub > 0 && (
          <p className="text-warning">{stats.playersWithoutClub} jogador(es) sem clube.</p>
        )}

        {report.warnings.length > 0 && (
          <Section title="Avisos" items={report.warnings} icon={AlertTriangle} tone="warning" />
        )}
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  items,
  icon: Icon,
  tone,
}: {
  title: string;
  items: string[];
  icon: typeof CheckCircle2;
  tone: "destructive" | "warning";
}) {
  return (
    <details className="text-xs" open={tone === "destructive"}>
      <summary
        className={`cursor-pointer font-medium ${tone === "destructive" ? "text-destructive" : "text-warning"}`}
      >
        {title} ({items.length})
      </summary>
      <ul className="mt-2 space-y-1 max-h-40 overflow-auto">
        {items.slice(0, 200).map((m, i) => (
          <li key={i} className="flex items-start gap-1">
            <Icon
              className={`size-3 shrink-0 mt-0.5 ${tone === "destructive" ? "text-destructive" : "text-warning"}`}
            />
            <span>{m}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function IssueList({ title, items }: { title: string; items: string[] }) {
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-warning font-medium">
        {title} ({items.length})
      </summary>
      <p className="mt-1 text-muted-foreground">
        {items.slice(0, 100).join(", ")}
        {items.length > 100 ? "…" : ""}
      </p>
    </details>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{children}</div>;
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
      <p className="text-base font-bold tabular-nums leading-none">{v}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

// Re-export for convenience (unused vars keep TS quiet)
void useQuery;
