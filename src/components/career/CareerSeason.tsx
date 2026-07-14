import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCareerSeason,
  useCareerJournal,
  useCareerMuseum,
  useCareerAchievements,
  useCareerStatistics,
  useCareerTrophies,
} from "@/lib/career/hooks";
import { useCareerImportData } from "@/lib/career/hooks/useCareerImportData";
import type { CareerSeasonId } from "@/lib/career/types";
import { fmtNum } from "@/lib/fmt";
import {
  Shield,
  MapPin,
  Trophy,
  Layers,
  ClipboardList,
  Sparkles,
  Image,
  BookOpen,
} from "lucide-react";

interface Props {
  seasonId: CareerSeasonId;
}

export function CareerSeason({ seasonId }: Props) {
  const { selectedSeason } = useCareerSeason({ seasonId });
  const { journal } = useCareerJournal({ seasonId });
  const { attachments } = useCareerMuseum({ seasonId });
  const { achievements } = useCareerAchievements({ seasonId });
  const { trophies } = useCareerTrophies({ seasonId });
  const { seasonAssessments, transferAssessments } = useCareerStatistics({ seasonId });
  const { importedSeasons, playersBySeason } = useCareerImportData();

  if (!selectedSeason) {
    return <p className="text-sm text-muted-foreground">Época não encontrada.</p>;
  }

  const imported = importedSeasons.find((item) => item.seasonYear === selectedSeason.season);
  const seasonPlayers = playersBySeason[selectedSeason.season] ?? [];

  const clubsSummary = (imported?.clubs ?? []).reduce(
    (acc, club) => {
      acc.matches += club.matches;
      acc.wins += club.wins;
      acc.draws += club.draws;
      acc.losses += club.losses;
      acc.gf += club.goalsFor;
      acc.ga += club.goalsAgainst;
      return acc;
    },
    { matches: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 },
  );

  const competitions = new Set<string>([selectedSeason.league]);
  for (const comp of imported?.competitions ?? []) competitions.add(comp);

  const highlights = [
    ...seasonPlayers
      .map((player) => ({
        title: player.playerName,
        subtitle: `${player.club} · ${fmtNum(player.goals)} golos · ${fmtNum(player.assists)} assistências`,
        score: player.goals + player.assists,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4),
  ];

  const assessmentEntries =
    seasonAssessments && "entries" in seasonAssessments ? seasonAssessments.entries : [];
  const transferEntries = Array.isArray(transferAssessments) ? transferAssessments : [];

  return (
    <div className="space-y-4">
      <Card className="border-gold/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display">Época {selectedSeason.season}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary" className="gap-1">
            <Shield className="size-3" /> {selectedSeason.club}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <MapPin className="size-3" /> {selectedSeason.country}
          </Badge>
          <Badge variant="outline">{selectedSeason.league}</Badge>
          <Badge variant="outline" className="gap-1">
            <Trophy className="size-3" /> {trophies.length} troféus
          </Badge>
        </CardContent>
      </Card>

      <Tabs defaultValue="resumo">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="resumo">
            <Layers className="size-3.5 mr-1" /> Resumo
          </TabsTrigger>
          <TabsTrigger value="competicoes">Competições</TabsTrigger>
          <TabsTrigger value="plantel">Plantel</TabsTrigger>
          <TabsTrigger value="avaliacao">
            <ClipboardList className="size-3.5 mr-1" /> Avaliação
          </TabsTrigger>
          <TabsTrigger value="destaques">
            <Sparkles className="size-3.5 mr-1" /> Destaques
          </TabsTrigger>
          <TabsTrigger value="galeria">
            <Image className="size-3.5 mr-1" /> Galeria
          </TabsTrigger>
          <TabsTrigger value="diario">
            <BookOpen className="size-3.5 mr-1" /> Diário
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Jogos" value={clubsSummary.matches} />
            <Kpi label="Vitórias" value={clubsSummary.wins} />
            <Kpi label="Golos +/-" value={`${clubsSummary.gf - clubsSummary.ga >= 0 ? "+" : ""}${clubsSummary.gf - clubsSummary.ga}`} />
            <Kpi label="Competições" value={competitions.size} />
          </div>
        </TabsContent>
        <TabsContent value="competicoes" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">Competições da Época</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[...competitions].map((comp) => (
                <div
                  key={comp}
                  className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{comp}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {trophies.some((t) => t.competition === comp) ? "Vencida" : "Disputada"}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="plantel" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">Plantel e Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {seasonPlayers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados de jogadores nesta época.</p>
              ) : (
                <div className="max-h-[380px] overflow-auto rounded-md border border-border/60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jogador</TableHead>
                        <TableHead>Clube</TableHead>
                        <TableHead className="text-right">Golos</TableHead>
                        <TableHead className="text-right">Assist.</TableHead>
                        <TableHead className="text-right">Impacto</TableHead>
                        <TableHead className="text-right">Rating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {seasonPlayers.map((player) => (
                        <TableRow
                          key={`${player.seasonYear}-${player.club}-${player.idu ?? player.playerName}`}
                        >
                          <TableCell className="font-medium">{player.playerName}</TableCell>
                          <TableCell>{player.club}</TableCell>
                          <TableCell className="text-right">{fmtNum(player.goals)}</TableCell>
                          <TableCell className="text-right">{fmtNum(player.assists)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {fmtNum(player.goals + player.assists)}
                          </TableCell>
                          <TableCell className="text-right">{fmtNum(player.avgRating ?? null, 2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="avaliacao" className="mt-4">
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display">Avaliação Automática</CardTitle>
              </CardHeader>
              <CardContent>
                {assessmentEntries.length ? (
                  <ul className="space-y-2">
                    {assessmentEntries.map((entry, index) => (
                      <li key={`${entry.type}-${index}`} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium">{entry.title}</div>
                          <Badge variant="outline" className="text-[10px]">
                            {entry.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{entry.body}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sem avaliação formal nesta época. O módulo usa narrativa automática com base em
                    desempenho, troféus e evolução do plantel.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display">Análise de Transferências</CardTitle>
              </CardHeader>
              <CardContent>
                {transferEntries.length ? (
                  <ul className="space-y-2">
                    {transferEntries.map((entry) => (
                      <li key={entry.id} className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{entry.playerName}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {entry.label}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {entry.club}
                          {entry.value != null ? ` · ${fmtNum(entry.value)}` : ""}
                          {entry.notes ? ` · ${entry.notes}` : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem avaliações de transferências nesta época.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="destaques" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                label: "Jogador da época",
                value: highlights[0]?.title ?? "Sem dados",
                sub: highlights[0]?.subtitle,
              },
              {
                label: "Revelação",
                value: highlights[1]?.title ?? "Sem dados",
                sub: highlights[1]?.subtitle,
              },
              {
                label: "Melhor marcador",
                value:
                  seasonPlayers
                    .slice()
                    .sort((a, b) => b.goals - a.goals)[0]?.playerName ?? "Sem dados",
                sub: `Golos: ${fmtNum(seasonPlayers.slice().sort((a, b) => b.goals - a.goals)[0]?.goals ?? 0)}`,
              },
              {
                label: "Melhor assistente",
                value:
                  seasonPlayers
                    .slice()
                    .sort((a, b) => b.assists - a.assists)[0]?.playerName ?? "Sem dados",
                sub: `Assistências: ${fmtNum(seasonPlayers.slice().sort((a, b) => b.assists - a.assists)[0]?.assists ?? 0)}`,
              },
            ].map((h) => (
              <Card key={h.label}>
                <CardContent className="p-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{h.label}</div>
                  <div className="text-sm mt-1 text-foreground">{h.value}</div>
                  {h.sub && <div className="text-xs text-muted-foreground mt-1">{h.sub}</div>}
                </CardContent>
              </Card>
            ))}
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Conquistas
                </div>
                <div className="text-lg font-display font-bold text-gold">
                  {achievements.length}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="galeria" className="mt-4">
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Galeria com {attachments.length} anexo(s). Upload e gestão avançada continuam
              disponíveis no separador Memórias.
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="diario" className="mt-4">
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4 text-sm">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Nota inicial
                </div>
                <p className="text-muted-foreground">{journal?.startNote ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-sm">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Nota final
                </div>
                <p className="text-muted-foreground">{journal?.endNote ?? "—"}</p>
              </CardContent>
            </Card>
            <div className="text-xs text-muted-foreground">
              {journal?.notes.length ?? 0} nota(s) livres.
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xl font-display font-bold text-gold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
