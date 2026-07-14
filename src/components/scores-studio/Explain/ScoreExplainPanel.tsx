import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ExplainResult } from "@/lib/scores";

interface Props {
  report: ExplainResult;
}

export function ScoreExplainPanel({ report }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Explain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4 text-sm">
            <div>
              <span className="text-muted-foreground">Score:</span> {(report.score ?? 0).toFixed(2)}
            </div>
            <div>
              <span className="text-muted-foreground">Grade:</span> {report.grade ?? "n/a"}
            </div>
            <div>
              <span className="text-muted-foreground">Confidence:</span>{" "}
              {(report.confidence?.value ?? 0).toFixed(1)}%
            </div>
            <div>
              <span className="text-muted-foreground">Schema:</span> {report.schemaVersion}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top Contributions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Componente</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Raw</TableHead>
                <TableHead>Norm</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Contribution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.contributions.slice(0, 20).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.category ?? "n/a"}</TableCell>
                  <TableCell>{item.rawValue != null ? item.rawValue.toFixed(2) : "n/a"}</TableCell>
                  <TableCell>{item.normalizedValue.toFixed(3)}</TableCell>
                  <TableCell>{item.weight.toFixed(2)}</TableCell>
                  <TableCell>{item.contribution.toFixed(3)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Trace</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[35vh] overflow-auto rounded-md bg-muted p-3 text-xs">
            {report.trace
              .map(
                (step) =>
                  `${step.group} | ${step.id} | raw=${step.rawValue ?? "n/a"} | norm=${step.normalizedValue.toFixed(3)} | weight=${step.weight.toFixed(2)} | contribution=${step.contribution.toFixed(3)} | ${step.status}`,
              )
              .join("\n")}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
