import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WeaknessesCard({ items }: { items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fragilidades</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem fragilidades táticas destacadas.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="size-4 mt-0.5 text-amber-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
