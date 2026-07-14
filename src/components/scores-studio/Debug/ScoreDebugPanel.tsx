import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DebugReport } from "@/lib/scores";

interface Props {
  report: DebugReport;
}

export function ScoreDebugPanel({ report }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Debug</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-4">
          <div>Score: {(report.summary.score ?? 0).toFixed(2)}</div>
          <div>Grade: {report.summary.grade ?? "n/a"}</div>
          <div>Confidence: {(report.summary.confidence ?? 0).toFixed(1)}%</div>
          <div>Missing: {report.summary.missing}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[40vh] overflow-auto rounded-md bg-muted p-3 text-xs">
            {report.text}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
