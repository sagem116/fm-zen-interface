import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Download, HelpCircle, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  canonicalExamples,
  convertCanonicalToInternal,
  parseCanonicalInput,
  type CanonicalRefKind,
  type CanonicalScore,
  type ResolvedRef,
} from "@/lib/scores/canonical";

const KIND_LABEL: Record<CanonicalRefKind, string> = {
  attribute: "Atributo",
  metric: "Métrica",
  context: "Contexto",
  modifier: "Modificador",
};

interface Props {
  onImport: (internalJson: string) => { ok: boolean; message: string };
  trigger?: React.ReactNode;
}

export function CanonicalImportDialog({ onImport, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string>(() =>
    JSON.stringify(canonicalExamples.player, null, 2),
  );
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>("");

  const preview = useMemo(() => {
    try {
      const scores = parseCanonicalInput(text);
      const results = scores.map((s) => convertCanonicalToInternal(s, { overrides }));
      return { ok: true as const, results, error: null as string | null };
    } catch (error) {
      return { ok: false as const, results: [], error: (error as Error).message };
    }
  }, [text, overrides]);

  const totalUnknown = preview.ok
    ? preview.results.reduce((n, r) => n + r.report.unknownCount, 0)
    : 0;
  const totalAmbiguous = preview.ok
    ? preview.results.reduce((n, r) => n + r.report.ambiguousCount, 0)
    : 0;
  const canImport = preview.ok && totalUnknown === 0;

  const handleOverride = (ref: ResolvedRef, id: string) => {
    setOverrides((prev) => ({ ...prev, [`${ref.kind}:${ref.input}`]: id }));
  };

  const handleImport = () => {
    if (!preview.ok) return;
    const internalScores = preview.results.map((r) => r.score);
    const payload = JSON.stringify({ scores: internalScores }, null, 2);
    const result = onImport(payload);
    setMessage(result.message);
    if (result.ok) {
      setTimeout(() => setOpen(false), 800);
    }
  };

  const loadExample = (key: keyof typeof canonicalExamples) => {
    setText(JSON.stringify(canonicalExamples[key], null, 2));
    setOverrides({});
    setMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Upload className="mr-1 size-4" /> Importar (Human/AI)
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar Score — Formato Canónico</DialogTitle>
          <DialogDescription>
            Cole um Score em formato Human/AI Friendly. Os nomes são resolvidos
            automaticamente para os IDs internos do Score Engine.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-xs uppercase text-muted-foreground">JSON canónico</Label>
              <div className="ml-auto flex flex-wrap gap-1">
                {(Object.keys(canonicalExamples) as Array<keyof typeof canonicalExamples>).map(
                  (k) => (
                    <Button key={k} size="sm" variant="ghost" onClick={() => loadExample(k)}>
                      {k}
                    </Button>
                  ),
                )}
              </div>
            </div>
            <Textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setOverrides({});
              }}
              rows={18}
              className="font-mono text-xs"
            />
            {preview.ok ? null : (
              <p className="text-xs text-destructive">{preview.error}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs uppercase text-muted-foreground">Pré-visualização</Label>
              <Badge variant="secondary" className="ml-auto">
                <CheckCircle2 className="mr-1 size-3" />
                {preview.ok
                  ? preview.results.reduce((n, r) => n + r.report.resolvedCount, 0)
                  : 0}
              </Badge>
              <Badge variant="outline">
                <AlertTriangle className="mr-1 size-3" /> {totalAmbiguous}
              </Badge>
              <Badge variant="destructive">
                <XCircle className="mr-1 size-3" /> {totalUnknown}
              </Badge>
            </div>
            <ScrollArea className="h-[420px] rounded-md border p-2">
              {preview.ok ? (
                <div className="space-y-4">
                  {preview.results.map((res, i) => (
                    <div key={i} className="space-y-1">
                      <p className="font-medium text-sm">
                        {res.score.name}{" "}
                        <span className="text-muted-foreground">({res.report.entity})</span>
                      </p>
                      <div className="space-y-1">
                        {res.report.refs.map((ref, idx) => (
                          <RefRow
                            key={`${ref.kind}-${ref.input}-${idx}`}
                            ref={ref}
                            onOverride={(id) => handleOverride(ref, id)}
                          />
                        ))}
                        {res.report.refs.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            (sem atributos, métricas, contextos ou modificadores)
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Corrige o JSON para ver o preview.</p>
              )}
            </ScrollArea>
          </div>
        </div>

        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!canImport}>
            Importar {preview.ok ? `(${preview.results.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RefRow({ ref, onOverride }: { ref: ResolvedRef; onOverride: (id: string) => void }) {
  const badge =
    ref.status === "resolved" ? (
      <CheckCircle2 className="size-3.5 text-emerald-500" />
    ) : ref.status === "ambiguous" ? (
      <AlertTriangle className="size-3.5 text-amber-500" />
    ) : (
      <XCircle className="size-3.5 text-destructive" />
    );

  return (
    <div className="flex items-center gap-2 rounded border px-2 py-1 text-xs">
      {badge}
      <span className="text-muted-foreground">{KIND_LABEL[ref.kind]}</span>
      <span className="font-medium">{ref.input}</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">peso {ref.weight}</span>
      <div className="ml-auto min-w-[180px]">
        {ref.status === "resolved" ? (
          <span className="text-emerald-600 dark:text-emerald-400">
            → {ref.matchedLabel}
          </span>
        ) : ref.candidates.length > 0 ? (
          <Select onValueChange={onOverride}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Escolher…" />
            </SelectTrigger>
            <SelectContent>
              {ref.candidates.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.label} ({Math.round(c.score * 100)}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-destructive">Sem sugestões</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface ExportProps {
  scores: Array<{ id: string; name: string }>;
  selectedScoreId: string;
  exportInternalScore: (id: string) => string;
  exportInternalLibrary: () => string;
  exportCanonicalScore: (id: string) => string;
  exportCanonicalLibrary: () => string;
  trigger?: React.ReactNode;
}

export function CanonicalExportDialog({
  scores,
  selectedScoreId,
  exportInternalScore,
  exportInternalLibrary,
  exportCanonicalScore,
  exportCanonicalLibrary,
  trigger,
}: ExportProps) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"selected" | "library">("selected");
  const [format, setFormat] = useState<"canonical" | "internal">("canonical");

  const payload = useMemo(() => {
    if (format === "canonical") {
      return scope === "selected" ? exportCanonicalScore(selectedScoreId) : exportCanonicalLibrary();
    }
    return scope === "selected" ? exportInternalScore(selectedScoreId) : exportInternalLibrary();
  }, [format, scope, selectedScoreId, exportCanonicalScore, exportCanonicalLibrary, exportInternalScore, exportInternalLibrary]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // ignore
    }
  };
  const download = () => {
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scores-${format}-${scope}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Download className="mr-1 size-4" /> Exportar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Exportar Scores</DialogTitle>
          <DialogDescription>
            <b>Human/AI Friendly</b> (recomendado para partilha) usa nomes legíveis.
            <b> Interno</b> preserva IDs para compatibilidade total.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">Formato</Label>
            <Tabs value={format} onValueChange={(v) => setFormat(v as typeof format)}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="canonical">Human/AI ★</TabsTrigger>
                <TabsTrigger value="internal">Interno</TabsTrigger>
              </TabsList>
              <TabsContent value="canonical" className="text-xs text-muted-foreground">
                Nomes legíveis (Finishing, Goals/90…). Ideal para partilha e geração por IA.
              </TabsContent>
              <TabsContent value="internal" className="text-xs text-muted-foreground">
                IDs internos (attribute.finishing…). Fidelidade total; recomendado só para backup.
              </TabsContent>
            </Tabs>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">Âmbito</Label>
            <Tabs value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="selected">Score selecionado</TabsTrigger>
                <TabsTrigger value="library">Biblioteca inteira</TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground">
              {scope === "selected"
                ? scores.find((s) => s.id === selectedScoreId)?.name ?? "—"
                : `${scores.length} score(s)`}
            </p>
          </div>
        </div>

        <ScrollArea className="h-[320px] rounded-md border">
          <pre className="p-3 text-xs">{payload}</pre>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={copy}>
            <Copy className="mr-1 size-4" /> Copiar
          </Button>
          <Button onClick={download}>
            <Download className="mr-1 size-4" /> Download .json
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

export function CanonicalDocsDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [example, setExample] = useState<keyof typeof canonicalExamples>("player");

  const json = useMemo(() => JSON.stringify(canonicalExamples[example], null, 2), [example]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm">
            <HelpCircle className="mr-1 size-4" /> Formato Canónico
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Formato Canónico — Human / AI Friendly</DialogTitle>
          <DialogDescription>
            Formato oficial para partilha e geração por IA. Não usa IDs internos —
            apenas nomes legíveis. O importador resolve sinónimos automaticamente
            ("Finishing" ≡ "Finalização" ≡ "FIN").
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-[180px_1fr]">
          <div className="space-y-1">
            <Label className="text-xs uppercase text-muted-foreground">Exemplos</Label>
            {(Object.keys(canonicalExamples) as Array<keyof typeof canonicalExamples>).map((k) => (
              <Button
                key={k}
                variant={k === example ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setExample(k)}
              >
                {k}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground space-y-1">
              <p><b>Campos:</b> <code>name</code>, <code>entity</code>, <code>category?</code>, <code>description?</code>.</p>
              <p><b>Grupos:</b> <code>attributes</code>, <code>metrics</code>, <code>contexts</code>, <code>modifiers</code> — cada item tem <code>{`{ name, weight }`}</code>.</p>
              <p><b>Entidades válidas:</b> <code>player · club · coach · competition · country</code>.</p>
            </div>
            <ScrollArea className="h-[360px] rounded-md border">
              <pre className="p-3 text-xs">{json}</pre>
            </ScrollArea>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(json).catch(() => {})}
            >
              <Copy className="mr-1 size-4" /> Copiar exemplo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
