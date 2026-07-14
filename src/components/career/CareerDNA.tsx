import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCareerDNA } from "@/lib/career/hooks";

const DIMENSIONS: Array<{ id: string; label: string }> = [
  { id: "filosofia", label: "Filosofia" },
  { id: "mercado", label: "Mercado" },
  { id: "formacao", label: "Formação" },
  { id: "tatica", label: "Estilo" },
  { id: "desenvolvimento", label: "Desenvolvimento" },
  { id: "competicoes", label: "Competições" },
];

export function CareerDNA() {
  const { careerDNA } = useCareerDNA();
  const byCat = new Map((careerDNA?.dimensions ?? []).map((d) => [d.category, d]));

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {DIMENSIONS.map((d) => {
        const dim = byCat.get(d.id as never);
        return (
          <Card key={d.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">{d.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dim?.summary ? (
                <p className="text-sm text-muted-foreground">{dim.summary}</p>
              ) : (
                <p className="text-xs text-muted-foreground italic">Sem dados ainda.</p>
              )}
              {dim?.tags?.length ? (
                <div className="flex flex-wrap gap-1">
                  {dim.tags.map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
