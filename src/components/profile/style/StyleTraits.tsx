import { Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StyleTraits({ traits }: { traits: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Traços de Estilo</CardTitle>
      </CardHeader>
      <CardContent>
        {traits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem traços fortes identificados nesta época.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {traits.map((trait) => (
              <Badge key={trait} variant="secondary" className="gap-1.5 py-1">
                <Tag className="size-3" />
                {trait}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
