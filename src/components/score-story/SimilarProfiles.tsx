import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EditorialContext } from "@/lib/editorial";

interface Props {
  ctx: EditorialContext;
  onSelect?: (name: string) => void;
}

export function SimilarProfiles({ ctx, onSelect }: Props) {
  if (!ctx.similar.length) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Perfis semelhantes</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {ctx.similar.map((s) => (
            <li key={s.name} className="flex items-center justify-between py-2 text-sm">
              <button
                type="button"
                className="truncate text-left font-medium hover:underline"
                onClick={() => onSelect?.(s.name)}
              >
                {s.name}
              </button>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {s.grade && <span>{s.grade}</span>}
                <span className="tabular-nums">{s.score.toFixed(1)}</span>
                <span className="tabular-nums opacity-70">Δ {s.distance.toFixed(2)}</span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
