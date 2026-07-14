import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TemporalPoint } from "@/lib/profile/temporal";
import { fmtNum } from "@/lib/fmt";

export function TimelineTable({ points }: { points: TemporalPoint[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Tabela temporal</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Época</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Diferença</TableHead>
              <TableHead className="text-right">Diferença %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {points.map((point, index) => {
              const prev = index > 0 ? points[index - 1] : null;
              const diff = prev ? point.value - prev.value : null;
              const diffPct =
                prev && prev.value !== 0 ? ((point.value - prev.value) / prev.value) * 100 : null;
              return (
                <TableRow key={point.season}>
                  <TableCell className="tabular-nums">{point.season}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtNum(point.value, 2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {diff == null ? "—" : `${diff >= 0 ? "+" : ""}${fmtNum(diff, 2)}`}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {diffPct == null ? "—" : `${diffPct >= 0 ? "+" : ""}${fmtNum(diffPct, 2)}%`}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
