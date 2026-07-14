import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { StyleComparisonResult } from "@/lib/profile/style";

export function StyleSimilarity({ result }: { result: StyleComparisonResult }) {
  if (!result.items.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Perfis Mais Semelhantes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {result.items.map((item, index) => (
          <div key={item.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {index + 1}. {item.name}
              </span>
              <span className="font-semibold tabular-nums">{item.similarity}%</span>
            </div>
            <Progress value={item.similarity} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
