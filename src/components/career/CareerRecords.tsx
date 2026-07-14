import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useCareerStatistics } from "@/lib/career/hooks";

const RECORDS = [
  { key: "biggest_win", label: "Maior vitória" },
  { key: "biggest_rout", label: "Maior goleada" },
  { key: "best_attack", label: "Melhor ataque" },
  { key: "best_defense", label: "Melhor defesa" },
  { key: "most_points", label: "Mais pontos" },
  { key: "biggest_sale", label: "Maior venda" },
  { key: "biggest_buy", label: "Maior compra" },
];

export function CareerRecords() {
  const { records } = useCareerStatistics();
  const map = records ?? {};

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {RECORDS.map((r) => {
        const rec = Object.values(map).find((x) => x?.key === r.key);
        return (
          <Card key={r.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <TrendingUp className="size-4 text-gold" /> {r.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rec ? (
                <>
                  <div className="text-xl font-display font-bold text-gold">{rec.value}</div>
                  {rec.context && (
                    <div className="text-xs text-muted-foreground mt-1">{rec.context}</div>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic">Sem registo.</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
