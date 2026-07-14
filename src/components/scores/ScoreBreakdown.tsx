import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScoreResult } from "@/lib/scores";

interface Props {
  result: ScoreResult | null;
}

export function ScoreBreakdown({ result }: Props) {
  if (!result?.breakdown) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sem breakdown disponível.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.breakdown.sections.map((section) => (
          <div key={section.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{section.label}</h4>
              <span className="text-sm tabular-nums">{section.subtotal.toFixed(2)}</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Componente</TableHead>
                  <TableHead>Raw</TableHead>
                  <TableHead>Norm</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead>Contribuição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.items.map((item) => (
                  <TableRow key={`${section.id}-${item.id}`}>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>
                      {item.value == null ? "-" : Number(item.value).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {item.normalizedValue == null ? "-" : item.normalizedValue.toFixed(3)}
                    </TableCell>
                    <TableCell>{item.weight == null ? "-" : item.weight.toFixed(2)}</TableCell>
                    <TableCell>
                      {item.contribution == null ? "-" : item.contribution.toFixed(3)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
