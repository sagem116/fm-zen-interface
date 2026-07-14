import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users } from "lucide-react";
import { useCareerImportData } from "@/lib/career/hooks/useCareerImportData";
import { fmtNum } from "@/lib/fmt";

export function CareerPlayers() {
  const { importedPlayers } = useCareerImportData();
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = importedPlayers.filter((player) => {
      if (!term) return true;
      const text = [player.playerName, player.club, String(player.seasonYear)]
        .join(" ")
        .toLowerCase();
      return text.includes(term);
    });

    return filtered.sort((a, b) => {
      const impactA = a.goals + a.assists;
      const impactB = b.goals + b.assists;
      if (impactA !== impactB) return impactB - impactA;
      return a.playerName.localeCompare(b.playerName, "pt", { sensitivity: "base" });
    });
  }, [importedPlayers, search]);

  const best = rows[0];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Users className="size-4 text-gold" /> Jogadores da Carreira
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{fmtNum(importedPlayers.length)} registos</Badge>
            {best && (
              <Badge variant="secondary">
                Destaque: {best.playerName} ({best.goals + best.assists} impacto)
              </Badge>
            )}
          </div>
          <Input
            placeholder="Pesquisar por jogador, clube ou época"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sem dados de jogadores. Associa o treinador e importa épocas para preencher a tabela.
            </p>
          ) : (
            <div className="max-h-[480px] overflow-auto rounded-md border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jogador</TableHead>
                    <TableHead>Época</TableHead>
                    <TableHead>Clube</TableHead>
                    <TableHead className="text-right">Golos</TableHead>
                    <TableHead className="text-right">Assist.</TableHead>
                    <TableHead className="text-right">RA/RM</TableHead>
                    <TableHead className="text-right">Impacto</TableHead>
                    <TableHead className="text-right">Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const impact = row.goals + row.assists;
                    return (
                      <TableRow key={`${row.seasonYear}-${row.club}-${row.idu ?? row.playerName}`}>
                        <TableCell>
                          <div className="font-medium">{row.playerName}</div>
                          <div className="text-xs text-muted-foreground">{row.idu ?? "Sem IDU"}</div>
                        </TableCell>
                        <TableCell>{row.seasonYear}</TableCell>
                        <TableCell>{row.club}</TableCell>
                        <TableCell className="text-right">{fmtNum(row.goals)}</TableCell>
                        <TableCell className="text-right">{fmtNum(row.assists)}</TableCell>
                        <TableCell className="text-right">
                          {fmtNum(row.ra, 1)} / {fmtNum(row.rm, 1)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{fmtNum(impact)}</TableCell>
                        <TableCell className="text-right">{fmtNum(row.avgRating ?? null, 2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
