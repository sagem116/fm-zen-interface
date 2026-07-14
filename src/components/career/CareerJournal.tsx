import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen } from "lucide-react";
import { useCareerJournal } from "@/lib/career/hooks";

export function CareerJournal() {
  const { journal } = useCareerJournal();
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <BookOpen className="size-4 text-gold" /> Nota inicial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Objetivos e expectativas para a época..."
            defaultValue={journal?.startNote ?? ""}
            rows={3}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Nota final</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Balanço final da época..."
            defaultValue={journal?.endNote ?? ""}
            rows={3}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">
            Notas livres ({journal?.notes.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {journal?.notes.length ? (
            journal.notes.map((n) => (
              <div
                key={n.id}
                className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
              >
                <div className="text-xs text-muted-foreground">
                  {n.date} · {n.category}
                </div>
                <div className="font-medium">{n.title}</div>
                <p className="text-sm text-muted-foreground mt-1">{n.content}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Sem notas ainda. Autosave será adicionado numa próxima fase.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
