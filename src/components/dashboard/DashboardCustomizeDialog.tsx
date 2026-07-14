import { ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { DashboardBlockDef } from "@/hooks/useDashboardLayout";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  blocks: DashboardBlockDef[];
  orderedIds: string[];
  isHidden: (id: string) => boolean;
  toggleHidden: (id: string) => void;
  move: (id: string, dir: -1 | 1) => void;
  reset: () => void;
}

export function DashboardCustomizeDialog({
  open,
  onOpenChange,
  blocks,
  orderedIds,
  isHidden,
  toggleHidden,
  move,
  reset,
}: Props) {
  const byId = new Map(blocks.map((b) => [b.id, b]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Personalizar Dashboard</DialogTitle>
          <DialogDescription>
            Reordene ou esconda os blocos do painel. As preferências ficam guardadas localmente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
          {orderedIds.map((id, idx) => {
            const def = byId.get(id);
            if (!def) return null;
            const hidden = isHidden(id);
            return (
              <div
                key={id}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
              >
                <span className={`flex-1 text-sm ${hidden ? "text-muted-foreground" : ""}`}>
                  {def.label}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => move(id, -1)}
                  disabled={idx === 0}
                  title="Subir"
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => move(id, 1)}
                  disabled={idx === orderedIds.length - 1}
                  title="Descer"
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => toggleHidden(id)}
                  title={hidden ? "Mostrar" : "Esconder"}
                >
                  {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={reset}>
            <RotateCcw className="size-4" /> Repor
          </Button>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
