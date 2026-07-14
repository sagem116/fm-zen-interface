import type { RecruitmentPlayer } from "@/features/recruitment/types/recruitment-models";
import type { ClubExplainModel, ExplainSection } from "../types";
import { analyzeCollectiveMetrics } from "./collective-metrics-analyzer";
import { buildClubPeerComparisons } from "./comparison-builder";
import { buildTeamStyleNarrative, buildTeamStyleTags } from "./team-style-builder";

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function toPercentLabel(value: number): string {
  if (value >= 12) return "acima";
  if (value <= -12) return "abaixo";
  return "em linha";
}

export function buildClubExplainModel(input: {
  clubName: string;
  season: number;
  players: RecruitmentPlayer[];
  allPlayers: RecruitmentPlayer[];
}): ClubExplainModel {
  const ownMetrics = analyzeCollectiveMetrics(input.players);
  const ownCompetition = input.players[0]?.competition ?? null;

  const leaguePlayers = input.allPlayers.filter(
    (player) => normalize(player.competition) === normalize(ownCompetition),
  );

  const leagueClubs = [...new Set(leaguePlayers.map((player) => player.club).filter(Boolean))] as string[];

  const clubPeers = leagueClubs
    .map((club) => {
      const players = leaguePlayers.filter((player) => normalize(player.club) === normalize(club));
      if (!players.length) return null;
      return {
        club,
        competition: ownCompetition,
        metrics: analyzeCollectiveMetrics(players),
      };
    })
    .filter((item): item is { club: string; competition: string | null; metrics: ReturnType<typeof analyzeCollectiveMetrics> } => item != null);

  const comparisons = buildClubPeerComparisons({
    ownClub: input.clubName,
    ownCompetition,
    ownMetrics,
    clubs: clubPeers,
  });

  const tags = buildTeamStyleTags(ownMetrics);

  const previousSeasonPlayers = input.players.filter((player) => {
    const history = ((player.metadata ?? {}).history as Array<Record<string, unknown>> | undefined) ?? [];
    return history.some((item) => Number(item.season) === input.season - 1);
  });

  const previousAttack = previousSeasonPlayers.length
    ? avg(
        previousSeasonPlayers.map((player) => {
          const history = ((player.metadata ?? {}).history as Array<Record<string, unknown>> | undefined) ?? [];
          const row = history.find((item) => Number(item.season) === input.season - 1);
          return Number(row?.ca ?? player.ca ?? 0);
        }),
      )
    : 0;
  const currentAttack = avg(input.players.map((player) => Number(player.ca ?? player.score ?? 0)));
  const seasonalDelta = previousAttack > 0 ? Math.round(((currentAttack - previousAttack) / previousAttack) * 100) : 0;

  const leagueAverage = clubPeers.length
    ? {
        attack: avg(clubPeers.map((item) => item.metrics.attack)),
        defense: avg(clubPeers.map((item) => item.metrics.defense)),
        possession: avg(clubPeers.map((item) => item.metrics.possession)),
      }
    : { attack: 0, defense: 0, possession: 0 };

  const sections: ExplainSection[] = [
    {
      id: "club-collective",
      title: "Comportamento Coletivo",
      subtitle: "Agregação de métricas individuais para leitura da equipa.",
      body: buildTeamStyleNarrative(ownMetrics),
      badges: tags.map((tag) => ({ label: tag, tone: "info" })),
      indicators: [
        { label: "Construção", value: ownMetrics.build },
        { label: "Ataque", value: ownMetrics.attack },
        { label: "Defesa", value: ownMetrics.defense },
        { label: "Posse", value: ownMetrics.possession },
        { label: "Transições", value: ownMetrics.transitions },
      ],
    },
    {
      id: "club-build-up",
      title: "Construção",
      subtitle: "Leitura de saída, circulação e progressão da equipa.",
      body:
        ownMetrics.build >= 70
          ? "A equipa inicia construção curta com boa relação entre passe curto, disciplina e progressão sustentada."
          : ownMetrics.build <= 45
            ? "A equipa evita construção longa em posse e privilegia progressão direta para ganhar metros cedo."
            : "A construção combina momentos apoiados e aceleração vertical, sem padrão totalmente dominante.",
      bullets: [
        `Utilização do corredor central: ${ownMetrics.vector.interiorPlay}/100.`,
        `Utilização das alas: ${ownMetrics.vector.widePlay}/100.`,
        `Passe curto vs longo: ${ownMetrics.vector.shortPassing}/100 vs ${ownMetrics.vector.longPassing}/100.`,
      ],
    },
    {
      id: "club-attack",
      title: "Ataque",
      subtitle: "Criação, eficácia e profundidade ofensiva.",
      body:
        ownMetrics.attack >= 70
          ? "O ataque combina criação contínua com finalização estável, mantendo profundidade e ritmo alto no último terço."
          : ownMetrics.attack <= 45
            ? "A equipa cria pouco volume limpo e tende a depender de momentos individuais para finalizar."
            : "Existe ataque funcional, mas sem domínio claro em criação recorrente ou eficiência máxima.",
      indicators: [
        { label: "Criação", value: ownMetrics.creativity },
        { label: "Finalização", value: ownMetrics.vector.finishing },
        { label: "Cruzamentos", value: ownMetrics.vector.crossing },
        { label: "Profundidade", value: ownMetrics.vector.progression },
      ],
    },
    {
      id: "club-defense",
      title: "Defesa",
      subtitle: "Intensidade, recuperação e organização sem bola.",
      body:
        ownMetrics.defense >= 70
          ? "A equipa pressiona cedo, recupera com frequência e mantém organização suficiente para reduzir transições contra."
          : ownMetrics.defense <= 45
            ? "A fase defensiva revela fragilidade em intensidade e recuperação, com maior exposição após perda."
            : "A equipa alterna bons momentos de bloco e recuperação com fases de menor controlo sem bola.",
      indicators: [
        { label: "Pressão", value: ownMetrics.vector.pressing },
        { label: "Recuperação", value: ownMetrics.vector.recovery },
        { label: "Agressividade", value: ownMetrics.vector.defensiveIntensity },
        { label: "Organização", value: ownMetrics.organization },
      ],
    },
    {
      id: "club-possession-transitions",
      title: "Posse e Transições",
      subtitle: "Ritmo de posse e reação aos momentos de mudança.",
      body:
        ownMetrics.possession >= 68 && ownMetrics.transitions >= 65
          ? "A equipa consegue controlar posse sem perder capacidade de acelerar após recuperação, equilibrando paciência e verticalidade."
          : ownMetrics.possession >= 68
            ? "A posse é dominante, mas a transição ofensiva tende a ser mais paciente do que explosiva."
            : ownMetrics.transitions >= 68
              ? "A equipa prefere atacar mudanças de estado e acelerar no espaço, mesmo com posse média mais curta."
              : "Nem a posse nem as transições aparecem como eixo principal, o que indica comportamento mais situacional.",
      indicators: [
        { label: "Controlo", value: ownMetrics.possession },
        { label: "Ritmo", value: ownMetrics.build },
        { label: "Verticalidade", value: ownMetrics.transitions },
        { label: "Imprevisibilidade", value: ownMetrics.unpredictability },
      ],
    },
    {
      id: "club-comparison",
      title: "Comparações",
      subtitle: "Época anterior, média da liga, topo da liga e clubes semelhantes.",
      body: `Face à época anterior, o indicador coletivo principal está ${seasonalDelta >= 0 ? "acima" : "abaixo"} em ${Math.abs(seasonalDelta)}%. Na liga, o clube está ${toPercentLabel(Math.round(((ownMetrics.attack - leagueAverage.attack) / Math.max(leagueAverage.attack, 1)) * 100))} da média ofensiva, ${toPercentLabel(Math.round(((ownMetrics.defense - leagueAverage.defense) / Math.max(leagueAverage.defense, 1)) * 100))} da média defensiva e ${toPercentLabel(Math.round(((ownMetrics.possession - leagueAverage.possession) / Math.max(leagueAverage.possession, 1)) * 100))} da média de posse.`,
      bullets: comparisons.slice(0, 4).map(
        (item) =>
          `${item.club}: similaridade ${item.similarity}%, ataque ${item.deltaAttack >= 0 ? "+" : ""}${item.deltaAttack}%, defesa ${item.deltaDefense >= 0 ? "+" : ""}${item.deltaDefense}%, posse ${item.deltaPossession >= 0 ? "+" : ""}${item.deltaPossession}%, transições ${item.deltaTransitions >= 0 ? "+" : ""}${item.deltaTransitions}%.`,
      ),
    },
  ];

  return {
    clubName: input.clubName,
    season: input.season,
    sections,
  };
}
