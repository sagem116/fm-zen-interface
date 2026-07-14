/**
 * ImportReportViewer — Relatório Técnico Completo de Import
 *
 * Renders all 14 sections of the AdvancedImportReport.
 * Read-only. No engine interactions. Purely presentational.
 */
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  FileJson,
  FileText,
  Info,
  Layers,
  Printer,
  Tag,
  XCircle,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type {
  AdvancedImportReport,
  AdvancedWarning,
  WarningSeverity,
} from "@/lib/imports/advanced-report";
import { formatMs } from "@/lib/imports/advanced-report";

// ─── helpers ────────────────────────────────────────────

const MODULE_LABEL: Record<string, string> = {
  clubs: "Clubes",
  coaches: "Treinadores",
  players: "Jogadores",
  competitions: "Competições",
  classifications: "Classificações",
  statistics: "Estatísticas",
  player_stats: "Estatísticas (legado)",
  player_profiles: "Jogadores (legado)",
  superleague: "SuperLeague (legado)",
  national: "Ligas Nacionais (legado)",
};

function StatusBadge({ status }: { status: "ok" | "warning" | "error" }) {
  if (status === "ok")
    return <Badge className="bg-green-600 text-white text-xs">Sucesso</Badge>;
  if (status === "warning")
    return <Badge className="bg-amber-500 text-white text-xs">Com avisos</Badge>;
  return <Badge variant="destructive" className="text-xs">Erro</Badge>;
}

function SeverityIcon({ sev }: { sev: WarningSeverity }) {
  if (sev === "critical") return <XCircle className="size-4 text-destructive shrink-0" />;
  if (sev === "warning") return <AlertTriangle className="size-4 text-amber-500 shrink-0" />;
  if (sev === "suggestion") return <Info className="size-4 text-blue-500 shrink-0" />;
  return <Info className="size-4 text-muted-foreground shrink-0" />;
}

function SeverityBadge({ sev }: { sev: WarningSeverity }) {
  const map = {
    critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    suggestion: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    info: "bg-muted text-muted-foreground",
  };
  const labels = {
    critical: "Crítico",
    warning: "Aviso",
    suggestion: "Sugestão",
    info: "Informação",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${map[sev]}`}>{labels[sev]}</span>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="rounded border p-3 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold ${accent ?? ""}`}>{value}</p>
    </div>
  );
}

function Section({
  icon,
  title,
  badge,
  children,
  defaultOpen = true,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border">
      <button
        type="button"
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        {badge}
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      </button>
      {open && <div className="border-t px-4 py-4 space-y-3">{children}</div>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm text-muted-foreground italic">{message}</p>
  );
}

// ─── Export helpers ──────────────────────────────────────

function exportJson(report: AdvancedImportReport) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `import-report-${report.summary.season}-${report.summary.moduleType}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("JSON exportado.");
}

function exportTxt(report: AdvancedImportReport) {
  const lines: string[] = [
    `=== RELATÓRIO DE IMPORT ===`,
    `Ficheiro: ${report.summary.fileName ?? "—"}`,
    `Época: ${report.summary.season}`,
    `Tipo: ${MODULE_LABEL[report.summary.moduleType] ?? report.summary.moduleType}`,
    `Data: ${new Date(report.summary.importDate).toLocaleString("pt-PT")}`,
    `Duração: ${formatMs(report.summary.totalDurationMs)}`,
    `Estado: ${report.summary.status}`,
    ``,
    `--- ESTATÍSTICAS ---`,
    `Total linhas: ${report.statistics.totalRows}`,
    `Linhas válidas: ${report.statistics.validRows}`,
    `Linhas ignoradas: ${report.statistics.ignoredRows}`,
    `Avisos: ${report.statistics.rowsWithWarnings}`,
    `Erros: ${report.statistics.rowsWithErrors}`,
    ``,
    `--- COLUNAS ---`,
    `Reconhecidas: ${report.columns.recognized.length}`,
    `Auto-descobertas: ${report.columns.autoDiscovered.length}`,
    `Ambíguas: ${report.columns.ambiguous.length}`,
    `Em falta: ${report.columns.missingRequired.length}`,
    `Ignoradas: ${report.columns.ignored.length}`,
    ``,
    `--- AVISOS (${report.warnings.length}) ---`,
    ...report.warnings.map(
      (w) => `[${w.severity.toUpperCase()}] ${w.category}: ${w.description}`,
    ),
    ``,
    `--- PERFORMANCE ---`,
    `Leitura: ${formatMs(report.performance.readerMs)}`,
    `Validação: ${formatMs(report.performance.validationMs)}`,
    `Normalização: ${formatMs(report.performance.normalizationMs)}`,
    `Gravação: ${formatMs(report.performance.storageMs)}`,
    `Total: ${formatMs(report.performance.totalMs)}`,
    ``,
    `=== FIM DO RELATÓRIO ===`,
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `import-report-${report.summary.season}-${report.summary.moduleType}-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("TXT exportado.");
}

function copyReport(report: AdvancedImportReport) {
  const text = JSON.stringify(report, null, 2);
  navigator.clipboard.writeText(text).then(() => toast.success("Relatório copiado."));
}

function printReport() {
  window.print();
}

// ─── Main component ─────────────────────────────────────

export interface ImportReportViewerProps {
  report: AdvancedImportReport;
}

export function ImportReportViewer({ report }: ImportReportViewerProps) {
  return (
    <div className="space-y-4 text-sm print:text-xs" id="import-report-content">
      {/* Header + Export buttons */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            Relatório Técnico de Import
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerado em {new Date(report.generatedAt).toLocaleString("pt-PT")}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 print:hidden">
          <Button size="sm" variant="outline" onClick={() => exportJson(report)}>
            <FileJson className="size-3.5 mr-1" /> JSON
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportTxt(report)}>
            <FileText className="size-3.5 mr-1" /> TXT
          </Button>
          <Button size="sm" variant="outline" onClick={() => copyReport(report)}>
            <Copy className="size-3.5 mr-1" /> Copiar
          </Button>
          <Button size="sm" variant="outline" onClick={printReport}>
            <Printer className="size-3.5 mr-1" /> Imprimir
          </Button>
        </div>
      </div>

      <Separator />

      {/* 1. Resumo Geral */}
      <Section
        icon={<Info className="size-4 text-primary" />}
        title="1. Resumo Geral"
        badge={<StatusBadge status={report.summary.status} />}
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ficheiro</span>
            <span className="font-medium truncate max-w-[200px]">{report.summary.fileName ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Época</span>
            <span className="font-medium">{report.summary.season}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tipo</span>
            <span className="font-medium">{MODULE_LABEL[report.summary.moduleType] ?? report.summary.moduleType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Data</span>
            <span className="font-medium">{new Date(report.summary.importDate).toLocaleString("pt-PT")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duração</span>
            <span className="font-medium">{formatMs(report.summary.totalDurationMs)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Folhas processadas</span>
            <span className="font-medium">{report.summary.sheetsProcessed}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Versão do Engine</span>
            <span className="font-medium">{report.summary.engineVersion}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estado</span>
            <StatusBadge status={report.summary.status} />
          </div>
        </div>
      </Section>

      {/* 2. Estatísticas Gerais */}
      <Section
        icon={<Layers className="size-4 text-primary" />}
        title="2. Estatísticas Gerais"
      >
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          <StatCard label="Total linhas" value={report.statistics.totalRows} />
          <StatCard label="Linhas válidas" value={report.statistics.validRows} accent="text-green-600" />
          <StatCard label="Ignoradas" value={report.statistics.ignoredRows} />
          <StatCard label="Corrigidas auto." value={report.statistics.correctedRows} accent="text-blue-600" />
          <StatCard label="Com avisos" value={report.statistics.rowsWithWarnings} accent="text-amber-600" />
          <StatCard label="Com erros" value={report.statistics.rowsWithErrors} accent="text-destructive" />
          <StatCard label="Entidades criadas" value={report.statistics.entitiesCreated} />
          <StatCard label="Entidades atualizadas" value={report.statistics.entitiesUpdated} />
          <StatCard label="Entidades ignoradas" value={report.statistics.entitiesIgnored} />
        </div>
      </Section>

      {/* 3. Colunas */}
      <Section
        icon={<Tag className="size-4 text-primary" />}
        title="3. Colunas"
        badge={
          <span className="text-xs text-muted-foreground">
            {report.columns.recognized.length + report.columns.autoDiscovered.length} mapeadas ·{" "}
            {report.columns.ignored.length} ignoradas
          </span>
        }
      >
        <Tabs defaultValue="recognized">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="recognized" className="text-xs">
              ✅ Reconhecidas ({report.columns.recognized.length})
            </TabsTrigger>
            <TabsTrigger value="auto" className="text-xs">
              🟡 Auto-descobertas ({report.columns.autoDiscovered.length})
            </TabsTrigger>
            <TabsTrigger value="ambiguous" className="text-xs">
              ⚠️ Ambíguas ({report.columns.ambiguous.length})
            </TabsTrigger>
            <TabsTrigger value="missing" className="text-xs">
              🔴 Em falta ({report.columns.missingRequired.length})
            </TabsTrigger>
            <TabsTrigger value="ignored" className="text-xs">
              🚫 Ignoradas ({report.columns.ignored.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recognized" className="mt-3">
            {report.columns.recognized.length === 0 ? (
              <EmptyState message="Nenhuma coluna reconhecida directamente." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b text-muted-foreground uppercase">
                    <tr>
                      <th className="py-1.5 pr-3 text-left">Cabeçalho</th>
                      <th className="py-1.5 pr-3 text-left">Folha</th>
                      <th className="py-1.5 text-left">ID Dictionary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.columns.recognized.map((col, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="py-1.5 pr-3 font-medium">{col.header}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{col.sheet}</td>
                        <td className="py-1.5 font-mono text-xs text-muted-foreground">{col.dictionaryId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="auto" className="mt-3">
            {report.columns.autoDiscovered.length === 0 ? (
              <EmptyState message="Nenhuma coluna descoberta automaticamente." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b text-muted-foreground uppercase">
                    <tr>
                      <th className="py-1.5 pr-3 text-left">Cabeçalho</th>
                      <th className="py-1.5 pr-3 text-left">Folha</th>
                      <th className="py-1.5 pr-3 text-left">Mapeamento sugerido</th>
                      <th className="py-1.5 pr-3 text-left">Confiança</th>
                      <th className="py-1.5 text-left">Decisão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.columns.autoDiscovered.map((col, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="py-1.5 pr-3 font-medium">{col.header}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{col.sheet}</td>
                        <td className="py-1.5 pr-3 font-mono text-xs">{col.suggestion}</td>
                        <td className="py-1.5 pr-3">
                          <span className={`font-medium ${col.confidence >= 80 ? "text-green-600" : "text-amber-600"}`}>
                            {col.confidence}%
                          </span>
                        </td>
                        <td className="py-1.5 text-muted-foreground">{col.decision}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ambiguous" className="mt-3">
            {report.columns.ambiguous.length === 0 ? (
              <EmptyState message="Sem colunas ambíguas." />
            ) : (
              <div className="space-y-2">
                {report.columns.ambiguous.map((col, i) => (
                  <div key={i} className="rounded border p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                      <span className="font-medium">{col.header}</span>
                      <span className="text-muted-foreground text-xs">({col.sheet})</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{col.reason}</p>
                    <div className="flex flex-wrap gap-1">
                      {col.possibleMappings.map((m, j) => (
                        <Badge key={j} variant="outline" className="text-xs font-mono">{m}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="missing" className="mt-3">
            {report.columns.missingRequired.length === 0 ? (
              <EmptyState message="Nenhuma coluna obrigatória em falta." />
            ) : (
              <div className="space-y-2">
                {report.columns.missingRequired.map((col, i) => (
                  <div key={i} className="rounded border border-destructive/30 p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <XCircle className="size-4 text-destructive shrink-0" />
                      <span className="font-medium">{col.column}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Impacto: {col.impact}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ignored" className="mt-3">
            {report.columns.ignored.length === 0 ? (
              <EmptyState message="Nenhuma coluna ignorada." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b text-muted-foreground uppercase">
                    <tr>
                      <th className="py-1.5 pr-3 text-left">Cabeçalho</th>
                      <th className="py-1.5 pr-3 text-left">Folha</th>
                      <th className="py-1.5 text-left">Ocorrências</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.columns.ignored.map((col, i) => (
                      <tr key={i} className="border-b border-border/30 text-muted-foreground">
                        <td className="py-1.5 pr-3">{col.header}</td>
                        <td className="py-1.5 pr-3">{col.sheet}</td>
                        <td className="py-1.5">{col.occurrences}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Section>

      {/* 4. Dictionary */}
      <Section
        icon={<BookOpen className="size-4 text-primary" />}
        title="4. Dictionary"
      >
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <StatCard label="Novos campos" value={report.dictionary.newFieldsCreated} />
          <StatCard label="Novos aliases" value={report.dictionary.newAliasesCreated} accent="text-blue-600" />
          <StatCard label="Atualizados" value={report.dictionary.fieldsUpdated} />
          <StatCard label="Pendentes" value={report.dictionary.fieldsPending} accent="text-amber-600" />
          <StatCard label="Confirmados" value={report.dictionary.fieldsConfirmed} accent="text-green-600" />
          <StatCard label="Ignorados" value={report.dictionary.fieldsIgnored} />
        </div>
      </Section>

      {/* 5. Normalização */}
      <Section
        icon={<Zap className="size-4 text-primary" />}
        title="5. Normalização"
        badge={
          <span className="text-xs text-muted-foreground">
            {report.normalizations.length} normalizações
          </span>
        }
        defaultOpen={false}
      >
        {report.normalizations.length === 0 ? (
          <EmptyState message="Nenhuma normalização registada neste import (dados disponíveis em imports futuros)." />
        ) : (
          <div className="space-y-2">
            {report.normalizations.map((n, i) => (
              <div key={i} className="rounded border p-3 text-sm flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs">{n.entity}</Badge>
                <span className="text-muted-foreground">{n.original}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{n.normalized}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {n.confidence}% · {n.source}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 6. Conflitos */}
      <Section
        icon={<AlertTriangle className="size-4 text-primary" />}
        title="6. Resolução de Conflitos"
        badge={
          report.conflicts.length > 0 ? (
            <Badge variant="secondary" className="text-xs">{report.conflicts.length}</Badge>
          ) : undefined
        }
        defaultOpen={false}
      >
        {report.conflicts.length === 0 ? (
          <EmptyState message="Nenhum conflito detectado." />
        ) : (
          <div className="space-y-2">
            {report.conflicts.map((c, i) => (
              <div key={i} className="rounded border p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{c.type}</Badge>
                  {c.value && <span className="font-medium text-sm">{c.value}</span>}
                </div>
                <p className="text-xs text-muted-foreground">Campo existente: {c.existingField}</p>
                <p className="text-xs">Decisão: {c.decision}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 7. Validação dos Dados */}
      <Section
        icon={<CheckCircle2 className="size-4 text-primary" />}
        title="7. Validação dos Dados"
        badge={
          report.dataValidation.total > 0 ? (
            <Badge variant="secondary" className="text-xs">{report.dataValidation.total} issues</Badge>
          ) : (
            <Badge className="bg-green-600 text-white text-xs">OK</Badge>
          )
        }
        defaultOpen={false}
      >
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          <StatCard label="Valores negativos" value={report.dataValidation.negativeValues} />
          <StatCard label="Valores vazios" value={report.dataValidation.emptyValues} />
          <StatCard label="Datas inválidas" value={report.dataValidation.invalidDates} />
          <StatCard label="Duplicados" value={report.dataValidation.duplicates} />
          <StatCard label="IDs repetidos" value={report.dataValidation.repeatedIds} />
          <StatCard label="Atributos inválidos" value={report.dataValidation.invalidAttributes} />
          <StatCard label="Percentagens > 100%" value={report.dataValidation.invalidPercentages} />
          <StatCard label="Métricas negativas" value={report.dataValidation.negativeMetrics} />
          <StatCard label="Outros" value={report.dataValidation.other} />
        </div>
      </Section>

      {/* 8. Avisos */}
      <Section
        icon={<AlertCircle className="size-4 text-primary" />}
        title="8. Avisos"
        badge={
          report.warnings.length > 0 ? (
            <Badge
              className={
                report.warnings.some((w) => w.severity === "critical")
                  ? "bg-destructive text-destructive-foreground text-xs"
                  : "bg-amber-500 text-white text-xs"
              }
            >
              {report.warnings.length}
            </Badge>
          ) : (
            <Badge className="bg-green-600 text-white text-xs">0</Badge>
          )
        }
      >
        {report.warnings.length === 0 ? (
          <EmptyState message="Sem avisos. Import completamente limpo." />
        ) : (
          <div className="space-y-2">
            {report.warnings.map((w) => (
              <WarningCard key={w.id} warning={w} />
            ))}
          </div>
        )}
      </Section>

      {/* 9. Melhorias Automáticas */}
      <Section
        icon={<Zap className="size-4 text-primary" />}
        title="9. Melhorias Automáticas"
        defaultOpen={false}
      >
        {report.autoImprovements.length === 0 ? (
          <EmptyState message="Nenhuma melhoria automática registada." />
        ) : (
          <div className="space-y-2">
            {report.autoImprovements.map((imp, i) => (
              <div key={i} className="flex items-center gap-3 rounded border px-3 py-2">
                <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                <span className="flex-1">{imp.description}</span>
                <Badge variant="secondary" className="text-xs">{imp.count}</Badge>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 10. Performance */}
      <Section
        icon={<Clock className="size-4 text-primary" />}
        title="10. Performance"
        defaultOpen={false}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <StatCard label="Leitura" value={formatMs(report.performance.readerMs)} />
          <StatCard label="Validação" value={formatMs(report.performance.validationMs)} />
          <StatCard label="Normalização" value={formatMs(report.performance.normalizationMs)} />
          <StatCard label="Gravação" value={formatMs(report.performance.storageMs)} />
          <StatCard label="Total" value={formatMs(report.performance.totalMs)} accent="text-primary font-bold" />
        </div>
      </Section>

      {/* 11. Estatísticas por Entidade */}
      <Section
        icon={<Layers className="size-4 text-primary" />}
        title="11. Estatísticas por Entidade"
        defaultOpen={false}
      >
        {report.entityStats.length === 0 ? (
          <EmptyState message="Sem estatísticas por entidade." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b text-muted-foreground uppercase">
                <tr>
                  <th className="py-1.5 pr-3 text-left">Entidade</th>
                  <th className="py-1.5 pr-3 text-right">Criados</th>
                  <th className="py-1.5 pr-3 text-right">Atualizados</th>
                  <th className="py-1.5 pr-3 text-right">Ignorados</th>
                  <th className="py-1.5 text-right">Com avisos</th>
                </tr>
              </thead>
              <tbody>
                {report.entityStats.map((e, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-1.5 pr-3 capitalize font-medium">{e.entity}</td>
                    <td className="py-1.5 pr-3 text-right text-green-600">{e.created}</td>
                    <td className="py-1.5 pr-3 text-right text-blue-600">{e.updated}</td>
                    <td className="py-1.5 pr-3 text-right text-muted-foreground">{e.ignored}</td>
                    <td className="py-1.5 text-right text-amber-600">{e.withWarnings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* 12. Estatísticas por Folha */}
      <Section
        icon={<FileText className="size-4 text-primary" />}
        title="12. Estatísticas por Folha"
        defaultOpen={false}
      >
        {report.sheetStats.length === 0 ? (
          <EmptyState message="Dados por folha disponíveis em imports com pipeline detalhado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b text-muted-foreground uppercase">
                <tr>
                  <th className="py-1.5 pr-3 text-left">Folha</th>
                  <th className="py-1.5 pr-3 text-right">Linhas</th>
                  <th className="py-1.5 pr-3 text-right">Válidas</th>
                  <th className="py-1.5 pr-3 text-right">Avisos</th>
                  <th className="py-1.5 pr-3 text-right">Erros</th>
                  <th className="py-1.5 text-right">Tempo</th>
                </tr>
              </thead>
              <tbody>
                {report.sheetStats.map((s, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-1.5 pr-3 font-medium">{s.name}</td>
                    <td className="py-1.5 pr-3 text-right">{s.rows}</td>
                    <td className="py-1.5 pr-3 text-right text-green-600">{s.valid}</td>
                    <td className="py-1.5 pr-3 text-right text-amber-600">{s.warnings}</td>
                    <td className="py-1.5 pr-3 text-right text-destructive">{s.errors}</td>
                    <td className="py-1.5 text-right text-muted-foreground">{formatMs(s.durationMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* 13. Alterações Produzidas */}
      <Section
        icon={<Download className="size-4 text-primary" />}
        title="13. Alterações Produzidas"
        defaultOpen={false}
      >
        {report.changes.length === 0 ? (
          <EmptyState message="Nenhuma alteração registada." />
        ) : (
          <div className="space-y-1.5">
            {report.changes.map((c, i) => (
              <div key={i} className="flex items-center justify-between rounded border px-3 py-2">
                <span>{c.description}</span>
                <Badge variant="secondary" className="text-xs font-semibold">{c.count.toLocaleString("pt-PT")}</Badge>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Raw trace (debug) */}
      {report.raw?.trace && report.raw.trace.length > 0 && (
        <Section
          icon={<Info className="size-4 text-muted-foreground" />}
          title="Pipeline Trace (Debug)"
          defaultOpen={false}
        >
          <div className="space-y-1 font-mono text-xs">
            {report.raw.trace.map((evt, i) => (
              <div
                key={i}
                className={`flex gap-2 ${evt.status === "error" ? "text-destructive" : evt.status === "warning" ? "text-amber-600" : "text-muted-foreground"}`}
              >
                <span className="shrink-0">[{evt.stage}]</span>
                <span>{evt.message}</span>
                <span className="ml-auto shrink-0">{new Date(evt.at).toLocaleTimeString("pt-PT")}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ─── Warning card ────────────────────────────────────────

function WarningCard({ warning }: { warning: AdvancedWarning }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded border p-3 space-y-1.5">
      <button
        type="button"
        className="w-full flex items-start gap-2 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <SeverityIcon sev={warning.severity} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <SeverityBadge sev={warning.severity} />
            <Badge variant="outline" className="text-xs">{warning.category}</Badge>
            {warning.column && (
              <Badge variant="outline" className="text-xs font-mono">{warning.column}</Badge>
            )}
          </div>
          <p className="text-sm mt-1">{warning.description}</p>
        </div>
        {expanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
      </button>
      {expanded && (
        <div className="pl-6 space-y-1 text-xs text-muted-foreground border-t pt-2">
          <div><span className="font-medium">Impacto:</span> {warning.impact}</div>
          <div><span className="font-medium">Recomendação:</span> {warning.recommendation}</div>
          {warning.entity && <div><span className="font-medium">Entidade:</span> {warning.entity}</div>}
          {warning.line && <div><span className="font-medium">Linha:</span> {warning.line}</div>}
        </div>
      )}
    </div>
  );
}
