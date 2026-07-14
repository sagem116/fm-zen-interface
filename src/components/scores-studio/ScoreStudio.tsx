import { lazy, Suspense, useMemo, useRef, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Download, Upload } from "lucide-react";
import { ScoreSidebar } from "./Sidebar/ScoreSidebar";
import { ScoreEditor } from "./Editor/ScoreEditor";
import { ScorePreviewPanel } from "./Preview/ScorePreviewPanel";
import { useScoreStudioState } from "./Common/useScoreStudioState";
import { CanonicalImportDialog, CanonicalExportDialog, CanonicalDocsDialog } from "./CanonicalIO";
import { buildCanonicalDocument, convertInternalToCanonical } from "@/lib/scores/canonical";
import { ScoreWizard } from "./wizard/ScoreWizard";

const ScoreValidationPanel = lazy(() =>
  import("./Validation/ScoreValidationPanel").then((module) => ({
    default: module.ScoreValidationPanel,
  })),
);
const ScoreExplainPanel = lazy(() =>
  import("./Explain/ScoreExplainPanel").then((module) => ({ default: module.ScoreExplainPanel })),
);
const ScoreDebugPanel = lazy(() =>
  import("./Debug/ScoreDebugPanel").then((module) => ({ default: module.ScoreDebugPanel })),
);
const ScoreLibraryPanel = lazy(() =>
  import("./Library/ScoreLibraryPanel").then((module) => ({ default: module.ScoreLibraryPanel })),
);

function scoreDiffSummary(aJson: string, bJson: string): { changedLines: number } {
  const aLines = aJson.split("\n");
  const bLines = bJson.split("\n");
  const max = Math.max(aLines.length, bLines.length);
  let changed = 0;
  for (let i = 0; i < max; i += 1) {
    if ((aLines[i] ?? "") !== (bLines[i] ?? "")) changed += 1;
  }
  return { changedLines: changed };
}

export function ScoreStudio() {
  const {
    state,
    filteredScores,
    createScore,
    duplicateScore,
    removeScore,
    updateScore,
    updateScoreById,
    saveVersion,
    setEntityFilter,
    setCategoryFilter,
    setTagFilter,
    setSearchTerm,
    setSelectedScoreId,
    toggleFavorite,
    setGlobalWeight,
    setGradeThreshold,
    addGradeThreshold,
    removeGradeThreshold,
    setSelectedEntityKind,
    setSelectedEntityName,
    setActiveScenario,
    saveScenario,
    updateSimulationValue,
    resetSimulationValues,
    randomizeScenario,
    exportScoreJson,
    resetToDefaults,
    setSelectedVersionA,
    setSelectedVersionB,
    setNormalizationOverride,
    exportScoresJson,
    importScoresJson,
  } = useScoreStudioState();

  const [importText, setImportText] = useState("");
  const [ioMessage, setIoMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const downloadJson = (filename: string, content: string) => {
    try {
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      setIoMessage(`Erro ao gerar ficheiro: ${(error as Error).message}`);
    }
  };

  const handleFileImport = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      setImportText(text);
      const result = importScoresJson(text);
      setIoMessage(`${file.name}: ${result.message}`);
    } catch (error) {
      setIoMessage(`Erro ao ler ficheiro: ${(error as Error).message}`);
    }
  };
  const [librarySortKey, setLibrarySortKey] = useState<
    "name" | "category" | "position" | "duty" | "status" | "updatedAt"
  >("name");
  const [librarySortDirection, setLibrarySortDirection] = useState<"asc" | "desc">("asc");

  const libraryScores = useMemo(() => {
    const getValue = (score: (typeof filteredScores)[number]) => {
      const position = String(score.metadata?.position ?? "");
      const duty = String(score.metadata?.duty ?? "");
      const updatedAt = String(
        score.metadata?.updatedAt ?? score.metadata?.createdAt ?? score.version ?? "",
      );
      switch (librarySortKey) {
        case "category":
          return score.categoryId;
        case "position":
          return position;
        case "duty":
          return duty;
        case "status":
          return score.status ?? "draft";
        case "updatedAt":
          return updatedAt;
        case "name":
        default:
          return score.name;
      }
    };

    return [...filteredScores].sort((left, right) => {
      const leftValue = getValue(left);
      const rightValue = getValue(right);
      const comparison = String(leftValue).localeCompare(String(rightValue));
      return librarySortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredScores, librarySortKey, librarySortDirection]);

  const toggleLibrarySort = (key: typeof librarySortKey) => {
    if (key === librarySortKey) {
      setLibrarySortDirection((value) => (value === "asc" ? "desc" : "asc"));
      return;
    }
    setLibrarySortKey(key);
    setLibrarySortDirection("asc");
  };

  const toggleScoreStatus = (score: (typeof filteredScores)[number]) => {
    const nextStatus = score.status === "active" ? "draft" : "active";
    updateScoreById(score.id, (current) => ({
      ...current,
      status: nextStatus,
      metadata: {
        ...(current.metadata ?? {}),
        updatedAt: new Date().toISOString(),
      },
    }));
    setIoMessage(`${score.name}: estado alternado para ${nextStatus}.`);
  };

  const currentVersions = state.selectedScore ? (state.versions[state.selectedScore.id] ?? []) : [];
  const versionA =
    currentVersions.find((item) => item.id === state.selectedVersionIdA) ?? currentVersions.at(-2);
  const versionB =
    currentVersions.find((item) => item.id === state.selectedVersionIdB) ?? currentVersions.at(-1);

  const versionDiff = useMemo(() => {
    if (!versionA || !versionB) return null;
    return scoreDiffSummary(
      JSON.stringify(versionA.score, null, 2),
      JSON.stringify(versionB.score, null, 2),
    );
  }, [versionA, versionB]);

  if (!state.selectedScore) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Score Studio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum score disponível.</p>
        </CardContent>
      </Card>
    );
  }

  return (
      <div className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
              <Brain className="size-6 text-primary" />
              Score Studio
            </h1>
            <p className="text-sm text-muted-foreground">
              Editor declarativo com playground, explain, validation e debug usando apenas APIs
              públicas do score engine.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              Schema {state.simulationEvaluation.result.schemaVersion}
            </Badge>
            <Badge
              variant={
                state.simulationEvaluation.validation.errors.length ? "destructive" : "secondary"
              }
            >
              {state.simulationEvaluation.validation.errors.length ? "Com erros" : "Válido"}
            </Badge>
            <CanonicalDocsDialog />
            <ScoreWizard onImport={importScoresJson} />
            <CanonicalImportDialog onImport={importScoresJson} />
            <CanonicalExportDialog
              scores={filteredScores.map((s) => ({ id: s.id, name: s.name }))}
              selectedScoreId={state.selectedScoreId}
              exportInternalScore={(id) => exportScoreJson(id as typeof state.selectedScoreId)}
              exportInternalLibrary={exportScoresJson}
              exportCanonicalScore={(id) => {
                const s = filteredScores.find((x) => x.id === id) ?? state.selectedScore;
                return JSON.stringify(convertInternalToCanonical(s), null, 2);
              }}
              exportCanonicalLibrary={() =>
                JSON.stringify(buildCanonicalDocument(filteredScores), null, 2)
              }
            />
            <Button variant="outline" onClick={resetToDefaults}>
              Reset defaults
            </Button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[330px_1fr]">
          <ScoreSidebar
            scores={filteredScores}
            selectedScoreId={state.selectedScoreId}
            favorites={state.favorites}
            entityFilter={state.entityFilter}
            categoryFilter={state.categoryFilter}
            tagFilter={state.tagFilter}
            searchTerm={state.searchTerm}
            onSearch={setSearchTerm}
            onEntityFilter={setEntityFilter}
            onCategoryFilter={setCategoryFilter}
            onTagFilter={setTagFilter}
            onSelectScore={(id) => setSelectedScoreId(id)}
            onToggleFavorite={toggleFavorite}
            onCreateScore={createScore}
            onDuplicateScore={duplicateScore}
            onRemoveScore={removeScore}
          />

          <div className="space-y-4">
            <ScoreLibraryPanel
              scores={libraryScores}
              selectedScoreId={state.selectedScoreId}
              sortKey={librarySortKey}
              sortDirection={librarySortDirection}
              onSortChange={toggleLibrarySort}
              onSelectScore={setSelectedScoreId}
              onDuplicateScore={(id: string) => duplicateScore(id as `score.${string}`)}
              onRemoveScore={(id: string) => removeScore(id as `score.${string}`)}
              onToggleStatus={toggleScoreStatus}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Global Tuning</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {(["attributes", "metrics", "contexts", "modifiers"] as const).map((key) => (
                  <div key={key} className="space-y-1">
                    <Label className="capitalize">{key}</Label>
                    <Input
                      type="number"
                      value={state.globalWeights[key]}
                      onChange={(event) => setGlobalWeight(key, Number(event.target.value))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Tabs defaultValue="editor" className="space-y-3">
              <TabsList className="flex h-auto flex-wrap justify-start">
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="preview">Playground</TabsTrigger>
                <TabsTrigger value="explain">Explain</TabsTrigger>
                <TabsTrigger value="validation">Validation</TabsTrigger>
                <TabsTrigger value="debug">Debug</TabsTrigger>
                <TabsTrigger value="library">Library</TabsTrigger>
                <TabsTrigger value="versions">Versions</TabsTrigger>
                <TabsTrigger value="io">I/O</TabsTrigger>
              </TabsList>

              <TabsContent value="editor">
                <ScoreEditor
                  score={state.selectedScore}
                  catalogs={state.catalogs}
                  normalizationOverrides={state.normalizationOverrides}
                  onSaveVersion={saveVersion}
                  onUpdateScore={updateScore}
                  onSetNormalizationOverride={setNormalizationOverride}
                />
              </TabsContent>

              <TabsContent value="preview">
                <ScorePreviewPanel
                  entityKind={state.selectedEntityKind}
                  entityName={state.selectedEntityName}
                  scenarios={state.scenarios}
                  activeScenarioId={state.activeScenarioId}
                  values={state.simulationValues}
                  scoreNow={
                    state.simulationEvaluation.result.score ??
                    state.simulationEvaluation.result.value ??
                    0
                  }
                  scoreBefore={
                    state.originalEvaluation.result.score ??
                    state.originalEvaluation.result.value ??
                    0
                  }
                  gradeNow={state.simulationEvaluation.result.grade ?? "n/a"}
                  gradeBefore={state.originalEvaluation.result.grade ?? "n/a"}
                  confidenceNow={state.simulationEvaluation.result.confidence?.value ?? 0}
                  onEntityKind={setSelectedEntityKind}
                  onEntityName={setSelectedEntityName}
                  onScenario={setActiveScenario}
                  onSaveScenario={saveScenario}
                  onValueChange={updateSimulationValue}
                  onReset={resetSimulationValues}
                  onRandomize={randomizeScenario}
                />
              </TabsContent>

              <TabsContent value="explain">
                <Suspense
                  fallback={<p className="text-sm text-muted-foreground">A carregar explain...</p>}
                >
                  <ScoreExplainPanel report={state.simulationEvaluation.explain} />
                </Suspense>
              </TabsContent>

              <TabsContent value="validation">
                <Suspense fallback={<p className="text-sm text-muted-foreground">A validar...</p>}>
                  <ScoreValidationPanel report={state.simulationEvaluation.validation} />
                </Suspense>
              </TabsContent>

              <TabsContent value="debug">
                <Suspense
                  fallback={<p className="text-sm text-muted-foreground">A gerar debug...</p>}
                >
                  <ScoreDebugPanel report={state.simulationEvaluation.debug} />
                </Suspense>
              </TabsContent>

              <TabsContent value="library">
                <Suspense
                  fallback={
                    <p className="text-sm text-muted-foreground">A carregar biblioteca...</p>
                  }
                >
                  <ScoreLibraryPanel
                    scores={filteredScores}
                    sortKey={librarySortKey}
                    sortDirection={librarySortDirection}
                    onSortChange={toggleLibrarySort}
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="versions">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Comparação v1/v2/v3</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Versão A</Label>
                        <Select
                          value={versionA?.id ?? "none"}
                          onValueChange={(value) =>
                            setSelectedVersionA(value === "none" ? null : value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma</SelectItem>
                            {currentVersions.map((version) => (
                              <SelectItem key={version.id} value={version.id}>
                                {version.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Versão B</Label>
                        <Select
                          value={versionB?.id ?? "none"}
                          onValueChange={(value) =>
                            setSelectedVersionB(value === "none" ? null : value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma</SelectItem>
                            {currentVersions.map((version) => (
                              <SelectItem key={version.id} value={version.id}>
                                {version.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {versionDiff ? (
                      <div className="rounded-md border p-3 text-sm">
                        <p>
                          Linhas alteradas: <b>{versionDiff.changedLines}</b>
                        </p>
                        <p className="text-muted-foreground">
                          {versionA?.label} ({versionA?.savedAt}) vs {versionB?.label} (
                          {versionB?.savedAt})
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Selecione duas versões para comparar.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="io">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Import / Export</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const json = exportScoreJson(state.selectedScoreId);
                          setImportText(json);
                          const scoreName =
                            filteredScores.find((s) => s.id === state.selectedScoreId)?.name ??
                            "score";
                          const safe = scoreName.replace(/[^a-z0-9-_]+/gi, "_").toLowerCase();
                          downloadJson(`score-${safe}.json`, json);
                          setIoMessage("Score selecionado exportado para ficheiro JSON.");
                        }}
                      >
                        <Download className="mr-1 size-4" /> Exportar score (.json)
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const json = exportScoresJson();
                          setImportText(json);
                          const stamp = new Date().toISOString().slice(0, 10);
                          downloadJson(`scores-library-${stamp}.json`, json);
                          setIoMessage("Biblioteca inteira exportada para ficheiro JSON.");
                        }}
                      >
                        <Download className="mr-1 size-4" /> Exportar tudo (.json)
                      </Button>
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-1 size-4" /> Importar ficheiro JSON
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/json,.json"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          void handleFileImport(file);
                          event.target.value = "";
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          const result = importScoresJson(importText);
                          setIoMessage(result.message);
                        }}
                      >
                        <Upload className="mr-1 size-4" /> Importar do editor
                      </Button>
                    </div>
                    <ScrollArea className="h-[320px] rounded-md border">
                      <textarea
                        className="min-h-[320px] w-full resize-none bg-transparent p-3 text-xs outline-none"
                        value={importText}
                        onChange={(event) => setImportText(event.target.value)}
                        placeholder="Cole aqui um ScoreDefinition ou um payload com múltiplos scores em JSON, ou use os botões acima para importar/exportar ficheiros."
                      />
                    </ScrollArea>
                    {ioMessage ? (
                      <p className="text-sm text-muted-foreground">{ioMessage}</p>
                    ) : null}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Grade Scale</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {state.gradeScale.thresholds.map((threshold, index) => (
                  <div
                    key={`${threshold.grade}-${index}`}
                    className="grid grid-cols-[1fr_1fr_auto] gap-2"
                  >
                    <Input
                      type="number"
                      value={threshold.minScore}
                      onChange={(event) =>
                        setGradeThreshold(index, "minScore", Number(event.target.value))
                      }
                    />
                    <Input
                      value={threshold.grade}
                      onChange={(event) => setGradeThreshold(index, "grade", event.target.value)}
                    />
                    <Button variant="ghost" onClick={() => removeGradeThreshold(index)}>
                      Remover
                    </Button>
                  </div>
                ))}
                <Button variant="outline" onClick={addGradeThreshold}>
                  Adicionar threshold
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}
