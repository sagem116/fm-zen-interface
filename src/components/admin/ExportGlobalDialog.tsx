import { useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  SECTIONS,
  GROUP_LABEL,
  PRESETS,
  emptySelection,
  selectionFromPreset,
  type PresetKey,
  type SectionKey,
  type SectionDef,
} from "@/lib/admin/section-catalog";
import { downloadGlobalExport, fetchAvailableSeasons } from "@/lib/admin/global-export";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ExportGlobalDialog({ open, onOpenChange }: Props) {
  const [preset, setPreset] = useState<PresetKey>("all");
  const [sections, setSections] = useState<Record<SectionKey, boolean>>(() =>
    selectionFromPreset("all"),
  );
  const [seasons, setSeasons] = useState<{ id: string; year: number; label: string | null }[]>([]);
  const [seasonSel, setSeasonSel] = useState<"all" | string[]>("all");
  const [compress, setCompress] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchAvailableSeasons().then(setSeasons);
  }, [open]);

  const grouped = useMemo(() => {
    const map: Record<SectionDef["group"], SectionDef[]> = {
      config: [],
      universe: [],
      analysis: [],
      career: [],
      cache: [],
    };
    for (const s of SECTIONS) map[s.group].push(s);
    return map;
  }, []);

  const applyPreset = (p: PresetKey) => {
    setPreset(p);
    if (p !== "custom") setSections(selectionFromPreset(p));
  };

  const toggleSection = (k: SectionKey) => {
    setPreset("custom");
    setSections((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const toggleSeason = (id: string) => {
    setSeasonSel((prev) => {
      if (prev === "all") return [id];
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      return next.length ? next : "all";
    });
  };

  const anySelected = Object.values(sections).some(Boolean);

  const handleExport = async () => {
    if (!anySelected) {
      toast.error("Seleciona pelo menos uma secção.");
      return;
    }
    setBusy(true);
    try {
      await downloadGlobalExport({ sections, seasons: seasonSel, compress });
      toast.success("Exportação gerada.");
      onOpenChange(false);
    } catch (e) {
      toast.error("Erro na exportação: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="size-5 text-primary" /> Exportação Global
          </DialogTitle>
          <DialogDescription>
            Escolhe secções, presets, épocas e formato. O JSON resultante fica pronto para
            restauração futura.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Presets */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Preset</Label>
            <RadioGroup
              value={preset}
              onValueChange={(v) => applyPreset(v as PresetKey)}
              className="flex flex-wrap gap-3"
            >
              {(["config", "universe", "rankings", "career", "all", "custom"] as PresetKey[]).map(
                (p) => (
                  <label
                    key={p}
                    className="flex items-center gap-2 rounded-md border px-3 py-1.5 cursor-pointer text-sm"
                  >
                    <RadioGroupItem value={p} />
                    {p === "config"
                      ? "Configuração"
                      : p === "universe"
                        ? "Universo FM"
                        : p === "rankings"
                          ? "Rankings"
                          : p === "career"
                            ? "Carreira"
                            : p === "all"
                              ? "Tudo"
                              : "Personalizado"}
                  </label>
                ),
              )}
            </RadioGroup>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {(Object.keys(grouped) as SectionDef["group"][]).map((g) => (
              <div key={g}>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {GROUP_LABEL[g]}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {grouped[g].map((s) => (
                    <label key={s.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={sections[s.key]}
                        onCheckedChange={() => toggleSection(s.key)}
                      />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Seasons */}
          {seasons.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Épocas</Label>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                  <Checkbox
                    checked={seasonSel === "all"}
                    onCheckedChange={() => setSeasonSel("all")}
                  />
                  Todas
                </label>
                {seasons.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
                  >
                    <Checkbox
                      checked={seasonSel !== "all" && seasonSel.includes(s.id)}
                      onCheckedChange={() => toggleSeason(s.id)}
                    />
                    {s.label ?? s.year}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Format */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Formato</Label>
            <RadioGroup
              value={compress ? "gz" : "json"}
              onValueChange={(v) => setCompress(v === "gz")}
              className="flex gap-3"
            >
              <label className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer">
                <RadioGroupItem value="json" /> JSON normal
              </label>
              <label className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer">
                <RadioGroupItem value="gz" /> JSON comprimido (.json.gz)
              </label>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={busy || !anySelected}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Referência ao PRESETS para evitar warning de import se decidir remover.
void PRESETS;
