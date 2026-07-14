import { useState } from "react";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { wipeAllData, clearDerivedLocalStorage } from "@/lib/fm-wipe";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ResetUniverseDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const armed = phrase === "APAGAR";

  const handleConfirm = async () => {
    if (!armed) return;
    setBusy(true);
    try {
      await wipeAllData();
      const cleared = clearDerivedLocalStorage();
      qc.clear();
      try {
        window.dispatchEvent(new CustomEvent("fm:universe-wiped"));
      } catch {
        /* noop */
      }
      toast.success(`Universo FM apagado. ${cleared} entradas locais limpas.`);
      onOpenChange(false);
      setPhrase("");
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      toast.error("Erro ao apagar: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) {
          onOpenChange(v);
          if (!v) setPhrase("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" /> Apagar todos os dados
          </DialogTitle>
          <DialogDescription>
            Esta operação irá eliminar permanentemente todos os dados importados: épocas, jogadores,
            treinadores, clubes, países, competições, classificações, estatísticas, históricos, Hall
            of Fame, desafios concluídos, conquistas, snapshots e cache.
            <br />
            <br />
            <strong className="text-foreground">Serão preservados:</strong> Dictionary, Score
            Studio, Intelligence Studio, configurações, pesos, fórmulas, rankings personalizados,
            tema e preferências.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reset-phrase" className="text-sm">
            Escreve <code className="rounded bg-muted px-1 font-mono">APAGAR</code> para confirmar
          </Label>
          <Input
            id="reset-phrase"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="APAGAR"
            autoComplete="off"
            disabled={busy}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={!armed || busy} onClick={handleConfirm}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Apagar universo FM
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
