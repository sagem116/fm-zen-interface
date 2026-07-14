import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkline } from "@/components/Sparkline";
import type { ScoreHistoryPoint } from "./types";

interface Props {
  history: ScoreHistoryPoint[];
}

export function ScoreEvolution({ history }: Props) {
  const values = history.map((item) => item.score);
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const best = values.length ? Math.max(...values) : 0;
  const worst = values.length ? Math.min(...values) : 0;
  const trend = values.length > 1 ? values[values.length - 1] - values[0] : 0;
  const regularity =
    values.length > 1
      ? Math.max(
          0,
          100 -
            Math.sqrt(values.reduce((acc, value) => acc + (value - avg) ** 2, 0) / values.length) *
              4,
        )
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Evolução</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {values.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem épocas para evolução.</p>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-xs text-muted-foreground">Série</p>
                <Sparkline values={values} width={220} height={50} />
              </div>
              <div className="text-right text-xs space-y-1">
                <p>
                  Média: <b>{avg.toFixed(2)}</b>
                </p>
                <p>
                  Melhor: <b>{best.toFixed(2)}</b>
                </p>
                <p>
                  Pior: <b>{worst.toFixed(2)}</b>
                </p>
                <p>
                  Regularidade: <b>{regularity.toFixed(1)}%</b>
                </p>
                <p>
                  Tendência:{" "}
                  <b>
                    {trend >= 0 ? "+" : ""}
                    {trend.toFixed(2)}
                  </b>
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
