import { useState } from "react";
import { Download, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetUniverseDialog } from "./ResetUniverseDialog";
import { ExportGlobalDialog } from "./ExportGlobalDialog";

export function AdminPanel() {
  const [resetOpen, setResetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="size-4 text-primary" /> Exportação Global
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Backup completo e configurável da FM Platform. Escolhe secções, presets, épocas e
            formato (JSON ou comprimido). Estrutura preparada para futura restauração.
          </p>
          <Button onClick={() => setExportOpen(true)}>
            <Download className="size-4" /> Abrir exportação global
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-4" /> Reset Total do Universo FM
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Elimina permanentemente todos os dados importados (épocas, entidades, estatísticas,
            classificações, rankings, Hall of Fame, desafios, conquistas, snapshots, cache).
            Preserva Dictionary, Score Studio, Intelligence Studio, configurações e preferências.
          </p>
          <Button variant="destructive" onClick={() => setResetOpen(true)}>
            <Trash2 className="size-4" /> Apagar todos os dados
          </Button>
        </CardContent>
      </Card>

      <ResetUniverseDialog open={resetOpen} onOpenChange={setResetOpen} />
      <ExportGlobalDialog open={exportOpen} onOpenChange={setExportOpen} />
    </div>
  );
}
