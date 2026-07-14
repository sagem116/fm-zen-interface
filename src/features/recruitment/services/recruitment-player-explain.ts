import {
  buildPlayerNarrativeContext,
  composeNarrative,
} from "@/lib/editorial";
import { makeEditorialDefinition } from "@/lib/editorial/pageNarratives";
import type { EditorialLevel } from "@/lib/editorial";
import type { RecruitmentPlayer } from "../types/recruitment-models";
import { buildRecruitmentStyleAnalysis } from "./recruitment-style";

export interface ExplainBadge {
  label: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}

export interface ExplainIndicator {
  label: string;
  value: number;
  hint?: string;
}

export interface ExplainRatingItem {
  label: string;
  value: number;
}

export interface RecruitmentExplainSection {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  bullets?: string[];
  badges?: ExplainBadge[];
  indicators?: ExplainIndicator[];
  ratings?: ExplainRatingItem[];
}

export interface RecruitmentPlayerExplainModel {
  playerId: string;
  playerName: string;
  generatedAt: string;
  sections: RecruitmentExplainSection[];
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function keywordMean(pool: Record<string, number>, tokens: string[]): number | null {
  const matches = Object.entries(pool)
    .filter(([key]) => tokens.some((token) => key.toLowerCase().includes(token)))
    .map(([, value]) => value);
  if (!matches.length) return null;
  return avg(matches);
}

function toScore(value: number | null, max = 100): number {
  if (value == null || !Number.isFinite(value)) return 50;
  if (max <= 0) return 50;
  if (value <= 1) return Math.round(Math.max(0, Math.min(100, value * 100)));
  return Math.round(Math.max(0, Math.min(100, (value / max) * 100)));
}

function stars(score: number): string {
  if (score >= 90) return "★★★★★";
  if (score >= 75) return "★★★★";
  if (score >= 60) return "★★★";
  if (score >= 45) return "★★";
  return "★";
}

function titleCase(value: string): string {
  return value
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
    .join(" ");
}

function mapScoreLabel(score: number): string {
  if (score >= 80) return "acima da média";
  if (score >= 65) return "sólido";
  if (score >= 50) return "equilibrado";
  if (score >= 35) return "instável";
  return "frágil";
}

function summarizeTemplate(level: EditorialLevel, narrativeBlocks: ReturnType<typeof composeNarrative>): string {
  const selected =
    level === "mini"
      ? narrativeBlocks.slice(0, 1)
      : level === "standard"
        ? narrativeBlocks.slice(0, 2)
        : narrativeBlocks.slice(0, 3);
  return selected.map((block) => block.text).join(" ").replace(/\s+/g, " ").trim();
}

function parseVectors(player: RecruitmentPlayer) {
  const metadata = asRecord(player.metadata);
  const attributesRaw = asRecord(metadata.attributes);
  const metricsRaw = asRecord(metadata.metrics);
  const statsRaw = asRecord(metadata.statistics);

  const attributes = Object.fromEntries(
    Object.entries(attributesRaw)
      .map(([key, value]) => [key, asNumber(value)])
      .filter((entry): entry is [string, number] => entry[1] != null),
  );
  const metrics = Object.fromEntries(
    Object.entries(metricsRaw)
      .map(([key, value]) => [key, asNumber(value)])
      .filter((entry): entry is [string, number] => entry[1] != null),
  );
  const statistics = Object.fromEntries(
    Object.entries(statsRaw)
      .map(([key, value]) => [key, asNumber(value)])
      .filter((entry): entry is [string, number] => entry[1] != null),
  );

  return { metadata, attributes, metrics, statistics };
}

function seriesFromHistory(player: RecruitmentPlayer): Array<{ season: number; ca: number; cp: number; score: number; value: number; avgRating: number }> {
  const history = (asRecord(player.metadata).history as Array<Record<string, unknown>> | undefined) ?? [];
  const series = history
    .map((item) => ({
      season: Number(item.season ?? 0),
      ca: Number(item.ca ?? player.ca ?? 0),
      cp: Number(item.cp ?? player.pa ?? player.ca ?? 0),
      score: Number(item.ca ?? player.score ?? player.ca ?? 0),
      value: Number(item.value ?? player.marketValue ?? 0),
      avgRating: Number(item.avgRating ?? 0),
    }))
    .filter((point) => Number.isFinite(point.season) && point.season > 0)
    .sort((a, b) => a.season - b.season);

  if (series.length) return series;

  return [
    {
      season: player.currentSeason ?? new Date().getFullYear(),
      ca: Number(player.ca ?? player.score ?? 0),
      cp: Number(player.pa ?? player.ca ?? 0),
      score: Number(player.score ?? player.ca ?? 0),
      value: Number(player.marketValue ?? 0),
      avgRating: 0,
    },
  ];
}

function topByValue(values: Record<string, number>, count = 6, descending = true): Array<[string, number]> {
  return Object.entries(values)
    .sort((a, b) => (descending ? b[1] - a[1] : a[1] - b[1]))
    .slice(0, count);
}

function compareAgainstPeerMean(target: number, peerValues: number[]): number {
  const baseline = avg(peerValues.filter((v) => Number.isFinite(v)));
  if (!Number.isFinite(baseline) || baseline <= 0) return 0;
  return Math.round(((target - baseline) / baseline) * 100);
}

function roleFromProfile(input: {
  styleSummary: string;
  finishing: number;
  creativity: number;
  defensive: number;
  buildUp: number;
  position: string | null;
}): string {
  const position = normalize(input.position);
  if (input.finishing >= 75 && /st|fw|avanc/.test(position)) return "Finalizador";
  if (input.creativity >= 75 && input.buildUp >= 70) return "Criador";
  if (input.defensive >= 72) return "Recuperador";
  if (input.buildUp >= 72) return "Construtor";
  if (/wing|ext|aml|amr/.test(position)) return "Extremo Vertical";
  if (/dm|mc/.test(position)) return "Organizador";
  if (/dc|cb/.test(position)) return "Defesa Construtor";
  if (/am/.test(position)) return "Playmaker";
  return input.styleSummary.includes("press") ? "Médio Box-to-Box" : "Pivô";
}

export function buildRecruitmentPlayerExplainModel(input: {
  player: RecruitmentPlayer;
  peers: RecruitmentPlayer[];
}): RecruitmentPlayerExplainModel {
  const { player, peers } = input;
  const { metadata, attributes, metrics, statistics } = parseVectors(player);
  const style = buildRecruitmentStyleAnalysis(player);
  const historySeries = seriesFromHistory(player);

  const age = player.age ?? asNumber(metadata.age) ?? null;
  const ca = player.ca ?? asNumber(metadata.ca) ?? player.score ?? 0;
  const pa = player.pa ?? asNumber(metadata.pa) ?? ca;
  const potentialGap = Math.max(0, pa - ca);
  const consistency = Math.max(
    0,
    Math.min(
      100,
      100 -
        Math.round(
          Math.sqrt(
            avg(historySeries.map((point) => (point.score - avg(historySeries.map((s) => s.score))) ** 2)),
          ) * 2.5,
        ),
    ),
  );

  const decisions = toScore(keywordMean(attributes, ["decision", "decis"]), 20);
  const anticipation = toScore(keywordMean(attributes, ["anticip"]), 20);
  const determination = toScore(keywordMean(attributes, ["determination", "determina"]), 20);
  const teamwork = toScore(keywordMean(attributes, ["teamwork", "equipa"]), 20);
  const concentration = toScore(keywordMean(attributes, ["concentration", "concentr"]), 20);

  const pace = toScore(keywordMean(attributes, ["pace", "veloc"]), 20);
  const acceleration = toScore(keywordMean(attributes, ["acceleration", "aceler"]), 20);
  const stamina = toScore(keywordMean(attributes, ["stamina", "resist"]), 20);
  const strength = toScore(keywordMean(attributes, ["strength", "forca", "força"]), 20);
  const agility = toScore(keywordMean(attributes, ["agility", "agil"]), 20);

  const passing = toScore(keywordMean(attributes, ["passing", "passe"]), 20);
  const firstTouch = toScore(keywordMean(attributes, ["first_touch", "first touch", "primeiro toque"]), 20);
  const dribbling = toScore(keywordMean(attributes, ["dribbl", "drible"]), 20);
  const crossing = toScore(keywordMean(attributes, ["cross"]), 20);
  const finishing = toScore(keywordMean(attributes, ["finish", "remate"]), 20);
  const technique = toScore(keywordMean(attributes, ["technique", "tecnica", "técnica"]), 20);

  const offensiveStat = toScore(
    avg([
      asNumber(statistics.gls) ?? asNumber(statistics["player.statistics.gls"]) ?? 0,
      asNumber(statistics.xg) ?? asNumber(statistics["player.statistics.xg"]) ?? 0,
      asNumber(statistics.ast) ?? asNumber(statistics["player.statistics.ast"]) ?? 0,
      asNumber(statistics["player.statistics.xa"]) ?? asNumber(statistics.xa) ?? 0,
    ]),
    20,
  );
  const defensiveStat = toScore(
    avg([
      asNumber(statistics.tackles_per90) ?? asNumber(statistics["player.statistics.tackles_per90"]) ?? 0,
      asNumber(statistics.interceptions) ?? asNumber(statistics["player.statistics.interceptions"]) ?? 0,
      asNumber(statistics.recoveries) ?? asNumber(statistics["player.statistics.recoveries"]) ?? 0,
      asNumber(statistics.pressures) ?? asNumber(statistics["player.statistics.pressures"]) ?? 0,
    ]),
    12,
  );

  const role = roleFromProfile({
    styleSummary: style.summary.toLowerCase(),
    finishing,
    creativity: style.vector.creativity,
    defensive: style.vector.defensiveIntensity,
    buildUp: style.vector.buildUp,
    position: player.position ?? (typeof metadata.position === "string" ? metadata.position : null),
  });
  const discipline = style.vector.discipline;

  const peerPosition = peers.filter(
    (candidate) => normalize(candidate.position) === normalize(player.position) && candidate.id !== player.id,
  );
  const peerLeague = peers.filter(
    (candidate) => normalize(candidate.competition) === normalize(player.competition) && candidate.id !== player.id,
  );
  const peerAge = peers.filter((candidate) => {
    if (candidate.id === player.id) return false;
    const candidateAge = candidate.age ?? asNumber(asRecord(candidate.metadata).age) ?? null;
    if (candidateAge == null || age == null) return false;
    return Math.abs(candidateAge - age) <= 2;
  });

  const rank =
    peers
      .slice()
      .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))
      .findIndex((candidate) => candidate.id === player.id) + 1;

  const historyForEditorial = historySeries.map((point) => ({
    season: point.season,
    score: point.score,
    rank,
  }));

  const editorial = buildPlayerNarrativeContext({
    identity: {
      name: player.name,
      kind: "player",
      age: age ?? undefined,
      club: player.club ?? undefined,
      competition: player.competition ?? undefined,
      country: player.country ?? undefined,
      role: role,
    },
    definition: makeEditorialDefinition("player", "Recruitment Explain"),
    scoreValue: Number(player.score ?? ca ?? 0),
    rank: Math.max(rank, 1),
    totalRanked: Math.max(peers.length, 1),
    history: historyForEditorial,
    peers: peers.map((candidate) => ({
      name: candidate.name,
      score: Number(candidate.score ?? 0),
    })),
    career: {
      seasons: historySeries.length,
      clubs: [...new Set(historySeries.map(() => player.club).filter((club): club is string => Boolean(club)))],
      peakSeason: historySeries.slice().sort((a, b) => b.score - a.score)[0]?.season,
      peakScore: historySeries.slice().sort((a, b) => b.score - a.score)[0]?.score,
    },
  });

  const narrative = composeNarrative(editorial, "standard", "player");

  const technicalRatings = [
    { label: "Passe", value: passing },
    { label: "Primeiro Toque", value: firstTouch },
    { label: "Técnica", value: technique },
    { label: "Drible", value: dribbling },
    { label: "Cruzamentos", value: crossing },
    { label: "Finalização", value: finishing },
  ];

  const mentalRatings = [
    { label: "Decisões", value: decisions },
    { label: "Antecipação", value: anticipation },
    { label: "Determinação", value: determination },
    { label: "Trabalho de Equipa", value: teamwork },
    { label: "Concentração", value: concentration },
  ];

  const physicalRatings = [
    { label: "Velocidade", value: pace },
    { label: "Aceleração", value: acceleration },
    { label: "Resistência", value: stamina },
    { label: "Força", value: strength },
    { label: "Agilidade", value: agility },
  ];

  const strengths = topByValue(
    Object.fromEntries([
      ...technicalRatings,
      ...mentalRatings,
      ...physicalRatings,
      { label: "Consistência", value: consistency },
      { label: "Potencial", value: toScore(potentialGap, 80) },
      { label: "Criatividade", value: style.vector.creativity },
      { label: "Disciplina", value: style.vector.discipline },
    ].map((entry) => [entry.label, entry.value])),
    6,
    true,
  );

  const weaknesses = topByValue(
    Object.fromEntries([
      ...technicalRatings,
      ...mentalRatings,
      ...physicalRatings,
      { label: "Consistência", value: consistency },
      { label: "Potencial", value: toScore(potentialGap, 80) },
      { label: "Criatividade", value: style.vector.creativity },
      { label: "Disciplina", value: style.vector.discipline },
    ].map((entry) => [entry.label, entry.value])),
    6,
    false,
  );

  const formationMap = {
    "4-3-3": avg([style.vector.progression, style.vector.pressing, style.vector.widePlay]),
    "4-2-3-1": avg([style.vector.creativity, style.vector.buildUp, style.vector.discipline]),
    "3-5-2": avg([style.vector.transitions, style.vector.recovery, style.vector.crossing]),
    "5-3-2": avg([style.vector.defensiveIntensity, style.vector.discipline, style.vector.recovery]),
    "4-4-2": avg([style.vector.finishing, style.vector.counterAttack, style.vector.pressing]),
  } as Record<string, number>;

  const functionFit = [
    { label: "Advanced Forward", value: avg([finishing, style.vector.transitions, pace]) },
    { label: "Deep Lying Playmaker", value: avg([passing, decisions, style.vector.buildUp]) },
    { label: "Inverted Winger", value: avg([dribbling, style.vector.progression, finishing]) },
    { label: "Ball Winning Midfielder", value: avg([defensiveStat, stamina, style.vector.pressing]) },
    { label: "Wing Back", value: avg([crossing, stamina, style.vector.widePlay]) },
    { label: "Target Forward", value: avg([finishing, strength, style.vector.longPassing]) },
  ].sort((a, b) => b.value - a.value);

  const latest = historySeries[historySeries.length - 1];
  const prev = historySeries.length > 1 ? historySeries[historySeries.length - 2] : null;
  const evoBody = prev
    ? `Comparando com ${prev.season}, ${player.name} ${latest.ca >= prev.ca ? "subiu" : "desceu"} no rendimento global (${Math.round(prev.ca)} → ${Math.round(latest.ca)}), com ${latest.avgRating >= prev.avgRating ? "melhoria" : "quebra"} na performance estatística.`
    : `Existe apenas uma época disponível para ${player.name}, o que limita conclusões sobre evolução longitudinal.`;

  const peerStyle = compareAgainstPeerMean(style.vector.creativity, peerPosition.map((candidate) => buildRecruitmentStyleAnalysis(candidate).vector.creativity));
  const peerScore = compareAgainstPeerMean(Number(player.score ?? ca), peerLeague.map((candidate) => Number(candidate.score ?? 0)));
  const peerPotential = compareAgainstPeerMean(potentialGap, peerAge.map((candidate) => {
    const candidatePa = Number(candidate.pa ?? candidate.ca ?? 0);
    const candidateCa = Number(candidate.ca ?? candidate.score ?? 0);
    return Math.max(0, candidatePa - candidateCa);
  }));

  const riskBase = avg([
    100 - consistency,
    Math.max(0, 100 - discipline),
    age != null && age > 31 ? 70 : 35,
    offensiveStat < 45 ? 60 : 35,
  ]);

  const sections: RecruitmentExplainSection[] = [
    {
      id: "profile-general",
      title: "Perfil Geral",
      subtitle: "Leitura editorial do perfil competitivo.",
      body: summarizeTemplate("standard", narrative),
      badges: [
        { label: role, tone: "info" },
        { label: `${mapScoreLabel(consistency)} · consistência`, tone: consistency >= 70 ? "success" : "warning" },
        { label: `${Math.round(potentialGap)} de margem CA/CP`, tone: potentialGap >= 20 ? "success" : "default" },
      ],
      indicators: [
        { label: "Maturidade Competitiva", value: toScore(ca, 200) },
        { label: "Potencial", value: toScore(potentialGap, 80) },
        { label: "Consistência", value: consistency },
        { label: "Risco", value: Math.round(riskBase) },
      ],
    },
    {
      id: "playing-style",
      title: "Forma de Jogar",
      subtitle: "Interpretação do comportamento em jogo a partir de métricas e atributos.",
      body: style.summary,
      bullets: [
        style.vector.progression >= 70 ? "Procura progressão vertical com frequência." : "Prefere construção mais controlada e paciente.",
        style.vector.creativity >= 70 ? "Cria oportunidades com elevada recorrência." : "Contribui mais na estabilidade do que na criação.",
        style.vector.pressing >= 70 ? "Pressiona ativamente e acelera recuperações." : "Escolhe melhor momentos de pressão, com menor agressividade.",
        style.vector.buildUp >= 70 ? "Participa bastante na construção inicial." : "Impacta mais em momentos de finalização/transição.",
      ],
      indicators: [
        { label: "Verticalidade", value: style.vector.progression },
        { label: "Criação", value: style.vector.creativity },
        { label: "Pressão", value: style.vector.pressing },
        { label: "Construção", value: style.vector.buildUp },
      ],
    },
    {
      id: "technical",
      title: "Perfil Técnico",
      subtitle: "Atributos técnicos e impacto direto no estilo.",
      body: `O perfil técnico é ${mapScoreLabel(Math.round(avg(technicalRatings.map((entry) => entry.value))))}: execução no passe (${passing}), capacidade de receção (${firstTouch}) e qualidade de decisão com bola (${technique}).`,
      ratings: technicalRatings,
    },
    {
      id: "mental",
      title: "Perfil Mental",
      subtitle: "Decisão, leitura de jogo e estabilidade competitiva.",
      body: `No plano mental, ${player.name} apresenta um perfil ${mapScoreLabel(Math.round(avg(mentalRatings.map((entry) => entry.value))))}, com destaque para decisões (${decisions}) e antecipação (${anticipation}).`,
      ratings: mentalRatings,
    },
    {
      id: "physical",
      title: "Perfil Físico",
      subtitle: "Capacidade atlética e impacto no ritmo competitivo.",
      body: `Fisicamente, o jogador está num nível ${mapScoreLabel(Math.round(avg(physicalRatings.map((entry) => entry.value))))}, influenciando intensidade de pressão, condução e repetição de esforços.`,
      ratings: physicalRatings,
    },
    {
      id: "statistical",
      title: "Perfil Estatístico",
      subtitle: "Leitura de produção ofensiva/defensiva e significado competitivo.",
      body: `A produção estatística indica contribuição ${mapScoreLabel(Math.round(avg([offensiveStat, defensiveStat])))}: ofensivamente ${offensiveStat}/100 e defensivamente ${defensiveStat}/100 no recorte disponível.`,
      indicators: [
        { label: "Impacto Ofensivo", value: offensiveStat },
        { label: "Impacto Defensivo", value: defensiveStat },
        { label: "Consistência Estatística", value: consistency },
      ],
      bullets: topByValue(statistics, 5, true).map(
        ([key, value]) => `${titleCase(key)} com valor ${Number(value).toFixed(2)} reforça o perfil competitivo.`,
      ),
    },
    {
      id: "team-role",
      title: "Papel na Equipa",
      subtitle: "Função inferida por atributos, estilo e produção.",
      body: `${player.name} enquadra-se sobretudo como ${role}, com contribuição principal em ${style.vector.creativity >= style.vector.finishing ? "organização e criação" : "ataque à baliza e finalização"}.`,
      badges: [{ label: role, tone: "info" }],
    },
    {
      id: "strengths",
      title: "Pontos Fortes",
      subtitle: "Ranking das competências acima da média.",
      body: "Os pontos fortes resultam da combinação entre atributos, consistência e indicadores de impacto.",
      bullets: strengths.map(([label, score]) => `${stars(score)} ${label} (${Math.round(score)})`),
    },
    {
      id: "weaknesses",
      title: "Pontos Fracos",
      subtitle: "Áreas com maior margem de melhoria.",
      body: "Os pontos fracos refletem os indicadores mais baixos no perfil atual.",
      bullets: weaknesses.map(([label, score]) => `${stars(score)} ${label} (${Math.round(score)})`),
    },
    {
      id: "tactical-fit",
      title: "Adequação Tática",
      subtitle: "Compatibilidade por modelo de jogo.",
      body: "A adequação é estimada pela proximidade entre vetor técnico-comportamental e exigências de cada estrutura tática.",
      ratings: Object.entries(formationMap)
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value: Math.round(value) })),
    },
    {
      id: "role-fit",
      title: "Adequação às Funções",
      subtitle: "Funções em que o perfil atual tende a render melhor.",
      body: "As funções são hierarquizadas por afinidade técnica, mental, física e estilo de execução.",
      bullets: functionFit.slice(0, 6).map((entry) => `${entry.label} · ${Math.round(entry.value)}/100`),
    },
    {
      id: "evolution",
      title: "Evolução",
      subtitle: "Mudança longitudinal de rendimento e estilo.",
      body: evoBody,
      indicators: [
        { label: "CA atual", value: toScore(latest?.ca ?? ca, 200) },
        { label: "PA atual", value: toScore(latest?.cp ?? pa, 200) },
        { label: "Trajetória", value: prev ? (latest.ca >= prev.ca ? 74 : 38) : 50 },
      ],
    },
    {
      id: "comparison",
      title: "Comparação",
      subtitle: "Posicionamento face a pares relevantes.",
      body: `${player.name} está ${peerScore >= 0 ? "acima" : "abaixo"} da média da liga em score (${peerScore}%), ${peerStyle >= 0 ? "acima" : "abaixo"} em criatividade da posição (${peerStyle}%) e ${peerPotential >= 0 ? "acima" : "abaixo"} no potencial da faixa etária (${peerPotential}%).`,
      badges: [
        { label: `Mesma posição: ${peerPosition.length}`, tone: "info" },
        { label: `Mesma liga: ${peerLeague.length}`, tone: "default" },
        { label: `Mesma idade: ${peerAge.length}`, tone: "default" },
      ],
    },
    {
      id: "potential",
      title: "Potencial",
      subtitle: "Leitura de teto evolutivo com CA/CP, idade e trajetória.",
      body: `Com ${age ?? "idade não disponível"} anos, margem CA/CP de ${Math.round(potentialGap)} e tendência ${prev ? (latest.ca >= prev.ca ? "ascendente" : "descendente") : "estável"}, o potencial é classificado como ${mapScoreLabel(toScore(potentialGap, 80))}.`,
      indicators: [
        { label: "Gap CA/CP", value: toScore(potentialGap, 80) },
        { label: "Idade vs janela ideal", value: age == null ? 50 : age <= 23 ? 90 : age <= 28 ? 72 : 48 },
        { label: "Trajetória", value: prev ? (latest.ca >= prev.ca ? 78 : 40) : 50 },
      ],
    },
    {
      id: "risk",
      title: "Risco",
      subtitle: "Riscos de performance e contexto.",
      body: `O risco global é ${Math.round(riskBase)}/100, influenciado por consistência (${consistency}), disciplina (${discipline}) e contexto físico/etário.`,
      bullets: [
        age != null && age > 31 ? "Idade acima do pico competitivo típico para evolução." : "Janela etária ainda favorável para manutenção/evolução.",
        consistency < 60 ? "Variação de rendimento entre épocas sugere possível inconsistência." : "Histórico com oscilação controlada de rendimento.",
        defensiveStat < 40 ? "Indicadores defensivos limitados podem expor dependência de contexto." : "Volume defensivo reduz risco em jogos de maior exigência.",
      ],
      indicators: [
        { label: "Risco físico/etário", value: age != null && age > 31 ? 72 : 38 },
        { label: "Risco de consistência", value: 100 - consistency },
        { label: "Risco contextual", value: defensiveStat < 40 ? 66 : 34 },
      ],
    },
    {
      id: "recommendations",
      title: "Recomendações",
      subtitle: "Conclusões editoriais orientadas à decisão.",
      body: `Recomendação principal: ${style.vector.buildUp >= 70 ? "ideal para equipas de posse e construção apoiada" : "ideal para contextos de transição e aceleração"}.`,
      bullets: [
        style.vector.buildUp >= 70
          ? "Encaixa melhor em equipas que querem controlar ritmo e posse."
          : "Encaixa melhor em equipas de ataque rápido e vertical.",
        potentialGap >= 20
          ? "Perfil indicado para desenvolvimento com upside claro."
          : "Perfil indicado para impacto mais imediato do que desenvolvimento longo.",
        consistency >= 70
          ? "Pode assumir minutos regulares sem grande oscilação de rendimento."
          : "Precisa de contexto estável e gestão de carga para estabilizar produção.",
      ],
      badges: [
        { label: style.vector.buildUp >= 70 ? "Posse" : "Transição", tone: "info" },
        { label: potentialGap >= 20 ? "Projeto" : "Pronto", tone: potentialGap >= 20 ? "success" : "default" },
      ],
    },
  ];

  return {
    playerId: player.id,
    playerName: player.name,
    generatedAt: new Date().toISOString(),
    sections,
  };
}
