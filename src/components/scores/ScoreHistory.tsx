import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScoreHistoryPoint } from "./types";

interface Props {
  history: ScoreHistoryPoint[];
  selectedSeason: number | null;
  onSelectSeason: (season: number | null) => void;
}

export function ScoreHistory({ history, selectedSeason, onSelectSeason }: Props) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm">Histórico por Época</CardTitle>
        <button
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onSelectSeason(null)}
        >
          Todas as épocas
        </button>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem histórico.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Época</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((point) => (
                <TableRow
                  key={point.season}
                  className={selectedSeason === point.season ? "bg-muted/50" : ""}
                  onClick={() => onSelectSeason(point.season)}
                >
                  <TableCell>{point.season}</TableCell>
                  <TableCell>{point.score.toFixed(2)}</TableCell>
                  <TableCell>{point.grade}</TableCell>
                  <TableCell>{point.confidence.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
