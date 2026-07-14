import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Image } from "lucide-react";
import { useCareerMuseum } from "@/lib/career/hooks";
import type { CareerAttachmentCategory } from "@/lib/career/types";

const CATEGORIES: Array<{ id: CareerAttachmentCategory; label: string }> = [
  { id: "squad", label: "Plantel" },
  { id: "tactics", label: "Táticas" },
  { id: "matches", label: "Jogos" },
  { id: "finals", label: "Finais" },
  { id: "transfers", label: "Transferências" },
  { id: "records", label: "Recordes" },
  { id: "other", label: "Outros" },
];

export function CareerMuseum({ showGallery = false }: { showGallery?: boolean }) {
  const { attachments } = useCareerMuseum();

  if (showGallery) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Image className="size-4 text-gold" /> Galeria
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda sem imagens. Upload em fase futura.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="aspect-square rounded-lg border border-border/60 bg-muted/30 flex items-center justify-center text-xs text-muted-foreground p-2 text-center"
                >
                  {a.name}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const counts = new Map<string, number>();
  for (const a of attachments) counts.set(a.category, (counts.get(a.category) ?? 0) + 1);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CATEGORIES.map((c) => (
        <Card key={c.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center justify-between">
              <span>{c.label}</span>
              <Badge variant="secondary" className="text-[10px]">
                {counts.get(c.id) ?? 0}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground italic">
              Biblioteca preparada — upload em fase futura.
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
