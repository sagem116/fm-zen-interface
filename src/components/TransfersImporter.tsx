import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Upload,
  ArrowLeftRight,
  UploadCloud,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  importTransfersFile,
  parseTransfersFile,
  type ParsedTransfersFile,
  type ImportTransfersProgress,
} from "@/lib/fm-transfers";
import { logImportFailure } from "@/lib/fm-db";
import { ImportProgressOverlay } from "@/components/ImportProgressOverlay";

const PHASE_LABELS: Record<ImportTransfersProgress["phase"], string> = {
  seasons: "A preparar época",
  lookups: "A carregar lookups",
  dedup: "A analisar duplicados",
  insert: "A gravar transferências",
  log: "A registar import",
};

export function TransfersImporter() {
  const qc = useQueryClient();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedTransfersFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ImportTransfersProgress | null>(null);

  async function handleFile(f: File) {
    setFile(f);
    setParsed(null);
    try {
      const buf = await f.arrayBuffer();
      const result = parseTransfersFile(buf);
      setParsed(result);
      if (result.fatal.length) {
        toast.error(result.fatal[0]);
      } else {
        toast.success(`${result.rows.length} transferências detetadas em ${f.name}`);
      }
    } catch (err) {
      toast.error(`Erro a ler ${f.name}: ${(err as Error).message}`);
    }
  }

  function clearFile() {
    setFile(null);
    setParsed(null);
  }

  async function run() {
    if (!file || !parsed) return;
    if (parsed.fatal.length) {
      toast.error("Não é possível importar: existem erros fatais.");
      return;
    }
    setBusy(true);
    setProgress(null);
    try {
      const result = await importTransfersFile(year, parsed, {
        filename: file.name,
        onProgress: (p) => setProgress(p),
      });
      toast.success(
        `Transferências ${year}: ${result.inserted} inseridas · ${result.duplicates} duplicadas · ${result.skipped} ignoradas`,
      );
      setFile(null);
      setParsed(null);
      qc.removeQueries();
      await qc.invalidateQueries();
    } catch (err) {
      const message = (err as Error).message;
      await logImportFailure(year, "transfers", file?.name ?? "", message);
      toast.error(`Erro: ${message}`);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const canImport = !!parsed && parsed.fatal.length === 0 && !busy;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowLeftRight className="size-4 text-primary" /> Transferências
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Ficheiro Excel com colunas <strong>Data, Pessoa, De, Para, Valor</strong>. Cada linha
          representa uma transferência (jogador ou treinador). Registos duplicados são detetados
          automaticamente.
        </p>

        <div className="grid gap-3 sm:grid-cols-[160px,1fr] items-start">
          <div className="space-y-1.5">
            <Label htmlFor="transfers-year">Época</Label>
            <Input
              id="transfers-year"
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())}
            />
          </div>

          <Dropzone
            title="Ficheiro de transferências"
            subtitle="Excel exportado do FM (.xlsx)"
            file={file ?? undefined}
            onFile={(f) => void handleFile(f)}
            onClear={clearFile}
          />
        </div>

        {parsed ? (
          <div
            className={`rounded-md border p-3 text-sm space-y-2 ${
              parsed.fatal.length
                ? "border-destructive/40 bg-destructive/5"
                : "border-border bg-muted/30"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {parsed.fatal.length ? (
                  <AlertTriangle className="size-4 text-destructive" />
                ) : (
                  <CheckCircle2 className="size-4 text-success" />
                )}
                <p>
                  <strong>{parsed.rows.length}</strong> linhas prontas a importar
                </p>
              </div>
              <div className="flex gap-1.5">
                {parsed.warnings.length > 0 && (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/40">
                    {parsed.warnings.length} avisos
                  </Badge>
                )}
                {parsed.fatal.length > 0 && (
                  <Badge variant="destructive">{parsed.fatal.length} erros</Badge>
                )}
              </div>
            </div>
            {parsed.fatal.length > 0 && (
              <ul className="text-destructive text-xs list-disc pl-5">
                {parsed.fatal.slice(0, 5).map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}
            {parsed.warnings.length > 0 && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Ver avisos</summary>
                <ul className="list-disc pl-5">
                  {parsed.warnings.slice(0, 20).map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ) : null}

        <ImportProgressOverlay
          active={busy}
          label={
            progress
              ? `${PHASE_LABELS[progress.phase]} · ${progress.processed}/${progress.total}`
              : `A importar transferências (${parsed?.rows.length ?? 0} linhas)`
          }
          progress={progress ? progress.ratio : null}
          historyKey="transfers"
        />

        <div className="flex justify-end">
          <Button onClick={run} disabled={!canImport}>
            {busy ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Upload className="size-4 mr-2" />
            )}
            Importar transferências
          </Button>
        </div>
      </CardContent>
    </Card>
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
