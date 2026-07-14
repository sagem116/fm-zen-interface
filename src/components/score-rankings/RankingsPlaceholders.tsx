import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SLOTS = [
  { key: "narrative", label: "Narrativa" },
  { key: "insights", label: "Insights" },
  { key: "breakdown", label: "Score Breakdown" },
] as const;

/** Reserved layout zones for future phases. Not rendered by default. */
export function RankingsPlaceholders({ show = false }: { show?: boolean }) {
  if (!show) return null;
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {SLOTS.map((s) => (
        <Card key={s.key} className={cn("border-dashed bg-muted/20")}>
          <CardContent className="flex h-24 items-center justify-center text-xs text-muted-foreground">
            {s.label} · em breve
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
