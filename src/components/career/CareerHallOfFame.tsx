import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Shield, Users, Trophy } from "lucide-react";
import { useCareerHallOfFame } from "@/lib/career/hooks";
import type { CareerHallOfFameGroup } from "@/lib/career/types";

const GROUPS: Array<{ id: CareerHallOfFameGroup; label: string; icon: typeof Crown }> = [
  { id: "players", label: "Jogadores", icon: Users },
  { id: "clubs", label: "Clubes", icon: Shield },
  { id: "coaches", label: "Treinadores", icon: Crown },
  { id: "competitions", label: "Competições", icon: Trophy },
];

export function CareerHallOfFame() {
  const { hallOfFame } = useCareerHallOfFame();
  const byGroup = new Map<CareerHallOfFameGroup, typeof hallOfFame>();
  for (const e of hallOfFame) {
    const arr = byGroup.get(e.group) ?? [];
    arr.push(e);
    byGroup.set(e.group, arr);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {GROUPS.map(({ id, label, icon: Icon }) => {
        const items = byGroup.get(id) ?? [];
        return (
          <Card key={id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Icon className="size-4 text-gold" /> {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Sem entradas.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {items.map((it) => (
                    <li key={it.id} className="flex items-center justify-between">
                      <span className="truncate">{it.entityName}</span>
                      <span className="text-xs text-muted-foreground">
                        {it.seasons.length} época(s)
                      </span>
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
