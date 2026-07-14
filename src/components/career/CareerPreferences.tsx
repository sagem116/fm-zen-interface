import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCareerPreferences } from "@/lib/career/hooks";
import type { CareerPreferenceCategory } from "@/lib/career/types";

const CATS: Array<{ id: CareerPreferenceCategory; label: string }> = [
  { id: "nationalities", label: "Nacionalidades" },
  { id: "countries", label: "Países" },
  { id: "clubs", label: "Clubes" },
  { id: "continents", label: "Continentes" },
  { id: "ages", label: "Idades" },
  { id: "positions", label: "Posições" },
  { id: "competitions", label: "Competições" },
];

export function CareerPreferences() {
  const { preferences } = useCareerPreferences();

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CATS.map((c) => {
        const bucket = preferences?.[c.id];
        const items = bucket?.top ?? [];
        return (
          <Card key={c.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Sem dados ainda.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {items.slice(0, 5).map((it) => (
                    <li key={it.value} className="flex items-center justify-between">
                      <span className="truncate">{it.value}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {it.count}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
