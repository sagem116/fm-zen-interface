import type { RecruitmentPlayer } from "@/features/recruitment/types/recruitment-models";
import { buildRecruitmentPlayerExplainModel } from "@/features/recruitment/services/recruitment-player-explain";
import { buildRecruitmentStyleAnalysis } from "@/features/recruitment/services/recruitment-style";
import type { ExplainSection, PlayerExplainModel } from "../types";
import { buildPlayerPeerComparisons } from "./comparison-builder";
import { buildTacticalExplainSection } from "./tactical-explain-builder";

function scopeLabel(scope: "position" | "team" | "league" | "global"): string {
  if (scope === "position") return "mesma posição";
  if (scope === "team") return "colegas de equipa";
  if (scope === "league") return "média da liga";
  return "média global";
}

export function buildPlayerExplainModel(input: {
  player: RecruitmentPlayer;
  peers: RecruitmentPlayer[];
  teamPlayers: RecruitmentPlayer[];
  leaguePlayers: RecruitmentPlayer[];
}): PlayerExplainModel {
  const recruitmentModel = buildRecruitmentPlayerExplainModel({
    player: input.player,
    peers: input.peers,
  });
  const style = buildRecruitmentStyleAnalysis(input.player);
  const comparisons = buildPlayerPeerComparisons({
    player: input.player,
    peers: input.peers,
    teamPlayers: input.teamPlayers,
    leaguePlayers: input.leaguePlayers,
  });

  const comparisonSection: ExplainSection = {
    id: "player-comparisons",
    title: "Comparações Inteligentes",
    subtitle: "Comparação automática por posição, equipa, liga e universo global.",
    body: "A leitura comparativa mostra se o perfil atual é apenas competitivo no contexto imediato ou realmente diferenciador em escalas mais amplas.",
    bullets: comparisons.map(
      (item) =>
        `${scopeLabel(item.scope)} (n=${item.sample}): criatividade ${item.deltaCreativity >= 0 ? "+" : ""}${item.deltaCreativity}%, finalização ${item.deltaFinishing >= 0 ? "+" : ""}${item.deltaFinishing}%, defesa ${item.deltaDefensive >= 0 ? "+" : ""}${item.deltaDefensive}%, construção ${item.deltaBuildUp >= 0 ? "+" : ""}${item.deltaBuildUp}%.`,
    ),
  };

  const tacticalSection = buildTacticalExplainSection({
    title: "Estilo de Jogo",
    subtitle: "Interpretação de como joga com e sem bola.",
    vector: style.vector,
  });

  const sections: ExplainSection[] = [...recruitmentModel.sections].map((section) => ({
    id: section.id,
    title: section.title,
    subtitle: section.subtitle,
    body: section.body,
    bullets: section.bullets,
    badges: section.badges,
    indicators: section.indicators,
  }));

  sections.push(tacticalSection, comparisonSection);

  return {
    playerName: input.player.name,
    season: input.player.currentSeason ?? new Date().getFullYear(),
    sections,
  };
}
