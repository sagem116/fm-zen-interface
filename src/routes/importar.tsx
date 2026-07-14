import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2, History, Search, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchImports, deleteImport, type ImportLogRow } from "@/lib/fm-db";
import { SeasonImporterV2 } from "@/components/SeasonImporterV2";
import { TransfersImporter } from "@/components/TransfersImporter";
import { ImportReportViewer } from "@/components/ImportReportViewer";
import {
  buildAdvancedReport,
  extractRawReport,
  type AdvancedImportReport,
} from "@/lib/imports/advanced-report";

export const Route = createFileRoute("/importar")({
  head: () => ({
    meta: [
      { title: "Importar Época — FM World Rankings" },
      {
        name: "description",
        content: "Importe os dois ficheiros Excel de uma nova época: Competições + Jogadores.",
      },
    ],
  }),
  component: ImportPage,
});

function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar Época</h1>
        <p className="text-muted-foreground text-sm mt-1">
          A importação está organizada em blocos independentes para Clubes, Treinadores, Jogadores,
          Competições, Classificações e Estatísticas. O importador continua a identificar folhas e
          colunas pelo respetivo nome.
        </p>
      </div>

      <SeasonImporterV2 />

      <TransfersImporter />

      <ImportsSeasonSummary />

      <ImportsHistory />
    </div>
  );
}

const IMPORT_TYPES = [
  "clubs",
  "coaches",
  "players",
  "competitions",
  "classifications",
  "statistics",
  "transfers",
] as const;
type ImportType = (typeof IMPORT_TYPES)[number];

function getImportRecordCount(row: ImportLogRow): number | null {
  const payload = row.warnings;
  if (!payload || typeof payload !== "object") return null;
  const records = (payload as { records?: unknown }).records;
  return typeof records === "number" ? records : null;
}

function ImportsSeasonSummary() {
  const { data: imports, isLoading } = useQuery({
    queryKey: ["fm-imports"],
    queryFn: fetchImports,
  });

  const bySeason = useMemo(() => {
    const map = new Map<number, Record<ImportType, ImportLogRow | null>>();
    for (const row of imports ?? []) {
      if (!IMPORT_TYPES.includes(row.module as ImportType)) continue;
      const module = row.module as ImportType;
      if (!map.has(row.season_year)) {
        map.set(row.season_year, {
          clubs: null,
          coaches: null,
          players: null,
          competitions: null,
          classifications: null,
          statistics: null,
          transfers: null,
        });
      }
      const season = map.get(row.season_year)!;
      const current = season[module];
      if (!current || new Date(row.created_at).getTime() > new Date(current.created_at).getTime()) {
        season[module] = row;
      }
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [imports]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resumo por Época</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> A carregar…
          </p>
        ) : bySeason.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados de importação para resumo.</p>
        ) : (
          <div className="space-y-5">
            {bySeason.map(([year, season]) => (
              <div key={year} className="rounded-lg border border-border p-4">
                <h3 className="font-semibold mb-3">Época {year}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                      <tr>
                        <th className="py-2 pr-3">Tipo</th>
                        <th className="py-2 pr-3">Estado</th>
                        <th className="py-2 pr-3">Última importação</th>
                        <th className="py-2 pr-3">Ficheiro</th>
                        <th className="py-2 pr-3">Registos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {IMPORT_TYPES.map((type) => {
                        const row = season[type];
                        return (
                          <tr key={type} className="border-b border-border/40">
                            <td className="py-2 pr-3">{MODULE_LABEL[type]}</td>
                            <td className="py-2 pr-3">
                              {!row ? (
                                <Badge variant="outline">Nao importado</Badge>
                              ) : row.status === "ok" ? (
                                <Badge className="bg-success text-success-foreground">
                                  Importado
                                </Badge>
                              ) : row.status === "warning" ? (
                                <Badge variant="secondary">Com avisos</Badge>
                              ) : (
                                <Badge variant="destructive">Erro</Badge>
                              )}
                            </td>
                            <td className="py-2 pr-3 text-muted-foreground">
                              {row ? new Date(row.created_at).toLocaleString("pt-PT") : "—"}
                            </td>
                            <td className="py-2 pr-3 text-muted-foreground">
                              {row?.filename ?? "—"}
                            </td>
                            <td className="py-2 pr-3">
                              {row ? (getImportRecordCount(row) ?? "—") : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ImportsHistory() {
  const qc = useQueryClient();
  const { data: imports, isLoading } = useQuery({
    queryKey: ["fm-imports"],
    queryFn: fetchImports,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reportRow, setReportRow] = useState<ImportLogRow | null>(null);
  const [advReport, setAdvReport] = useState<AdvancedImportReport | null>(null);

  function openReport(row: ImportLogRow) {
    const raw = extractRawReport(row.warnings);
    const report = buildAdvancedReport({
      fileName: row.filename,
      season: row.season_year,
      moduleType: row.module,
      importDate: row.created_at,
      status: row.status as "ok" | "warning" | "error",
      raw,
    });
    setAdvReport(report);
    setReportRow(row);
  }

  const filteredImports = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return imports ?? [];
    return (imports ?? []).filter((row) => {
      const dateText = new Date(row.created_at).toLocaleString("pt-PT");
      const haystack = [
        row.season_year,
        MODULE_LABEL[row.module] ?? row.module,
        row.filename ?? "",
        dateText,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [imports, search]);

  async function handleDelete(row: ImportLogRow) {
    const moduleLabel = MODULE_LABEL[row.module] ?? row.module;
    const label = `${moduleLabel} · ${row.season_year}`;
    if (
      !confirm(
        `Eliminar importação "${label}"?\n\nIsto remove TODOS os dados desta época para este ficheiro.`,
      )
    )
      return;
    setBusy(row.id);
    try {
      await deleteImport(row);
      qc.removeQueries();
      await qc.invalidateQueries();
      toast.success("Importação eliminada");
    } catch (err) {
      toast.error(`Erro ao eliminar: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="size-4 text-primary" /> Importações realizadas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <label className="sr-only" htmlFor="imports-search">
            Pesquisar histórico
          </label>
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="imports-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por época, tipo, nome do ficheiro ou data"
              className="pl-9"
            />
          </div>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> A carregar…
          </p>
        ) : filteredImports.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem importações registadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Época</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Nome do ficheiro</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredImports.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/50 hover:bg-muted/40 cursor-pointer"
                    onClick={() => openReport(r)}
                  >
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("pt-PT")}
                    </td>
                    <td className="py-2 pr-3 font-medium">{r.season_year}</td>
                    <td className="py-2 pr-3">
                      <Badge variant="secondary">{MODULE_LABEL[r.module] ?? r.module}</Badge>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="text-muted-foreground">{r.filename ?? "—"}</span>
                    </td>
                    <td className="py-2 pr-3">
                      {r.status === "ok" ? (
                        <Badge className="bg-success text-success-foreground">OK</Badge>
                      ) : r.status === "warning" ? (
                        <Badge variant="secondary">Avisos</Badge>
                      ) : (
                        <Badge variant="destructive">Erro</Badge>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Ver relatório completo"
                          onClick={(e) => { e.stopPropagation(); openReport(r); }}
                        >
                          <FileText className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={busy === r.id}
                          onClick={(e) => { e.stopPropagation(); void handleDelete(r); }}
                        >
                          {busy === r.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>

    {/* ── Report Detail Side Panel ── */}
    <Sheet open={!!reportRow} onOpenChange={(open) => { if (!open) { setReportRow(null); setAdvReport(null); } }}>
      <SheetContent className="w-full sm:max-w-3xl flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-muted-foreground" />
            Relatório de Import
          </SheetTitle>
          <SheetDescription className="text-xs">
            {reportRow
              ? `${MODULE_LABEL[reportRow.module] ?? reportRow.module} · Época ${reportRow.season_year} · ${new Date(reportRow.created_at).toLocaleString("pt-PT")}`
              : ""}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          {advReport ? (
            <ImportReportViewer report={advReport} />
          ) : (
            <p className="text-sm text-muted-foreground">A carregar relatório…</p>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
    </>
  );
}

const MODULE_LABEL: Record<string, string> = {
  clubs: "Clubes",
  coaches: "Treinadores",
  players: "Jogadores",
  competitions: "Competições",
  classifications: "Classificações",
  statistics: "Estatísticas",
  transfers: "Transferências",
  player_stats: "Estatísticas (legado)",
  player_profiles: "Jogadores (legado)",
  superleague: "SuperLeague (legado)",
  national: "Ligas Nacionais (legado)",
};
